// supabase/functions/create-payment-intent/index.ts
//
// Called when the customer taps "Pay" on a checkout hold. Creates (or reuses,
// if already in flight) a PayMongo Payment Intent for that hold's deposit.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import { createPaymentIntent } from '../_shared/paymongo.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse(
      { error: 'Missing Authorization header' },
      { status: 401 },
    );
  }

  const { bookingId } = await req.json();
  if (!bookingId) {
    return jsonResponse({ error: 'bookingId is required' }, { status: 400 });
  }

  // Scoped to the caller's own session, so `bookings_select_own_or_admin`
  // RLS is the only ownership check needed — a customer session can only
  // ever read (and therefore only ever create an intent for) their own
  // hold. An admin session can read any booking under the same policy, so
  // an admin's bearer token can call this for any customer's hold too —
  // same as everywhere else in this app admin sessions are already fully
  // trusted.
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: booking, error: bookingError } = await callerClient
    .from('bookings')
    .select('id, reference, status, hold_expires_at, items(deposit)')
    .eq('id', bookingId)
    .maybeSingle();

  if (bookingError) {
    return jsonResponse({ error: bookingError.message }, { status: 500 });
  }
  if (!booking) {
    return jsonResponse({ error: 'Booking not found' }, { status: 404 });
  }
  if (booking.status !== 'hold') {
    return jsonResponse(
      { error: 'This booking is not an active hold' },
      { status: 409 },
    );
  }
  if (new Date(booking.hold_expires_at as string) < new Date()) {
    return jsonResponse({ error: 'This hold has expired' }, { status: 409 });
  }

  // Service-role client for writing `payments`, which no client session may
  // write to directly for a deposit row (see 0019's RLS policy).
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: existing } = await serviceClient
    .from('payments')
    .select('paymongo_payment_intent_id')
    .eq('booking_id', bookingId)
    .eq('type', 'deposit')
    .eq('status', 'processing')
    .maybeSingle();

  if (existing?.paymongo_payment_intent_id) {
    // Idempotent retry — e.g. the customer backgrounded the app mid-payment.
    // PayMongo's client_key is not re-derivable from the intent id alone, so
    // re-fetch the intent to hand back a usable client_key.
    const res = await fetch(
      `https://api.paymongo.com/v1/payment_intents/${existing.paymongo_payment_intent_id}`,
      {
        headers: {
          Authorization: `Basic ${btoa(`${Deno.env.get('PAYMONGO_SECRET_KEY')}:`)}`,
        },
      },
    );
    const json = await res.json();
    if (res.ok && json?.data?.attributes?.client_key) {
      return jsonResponse(
        {
          clientKey: json.data.attributes.client_key,
          paymentIntentId: existing.paymongo_payment_intent_id,
        },
        { status: 200 },
      );
    }

    // The re-fetch failed or came back in an unexpected shape. Leaving the
    // existing row at 'processing' would permanently wedge this booking —
    // the unique partial index on one processing deposit per booking blocks
    // any fresh insert below while it stands. Mark it failed and fall
    // through to create a brand-new intent instead of erroring out.
    await serviceClient
      .from('payments')
      .update({ status: 'failed' })
      .eq('booking_id', bookingId)
      .eq('type', 'deposit')
      .eq('status', 'processing');
  }

  const deposit = Number(
    (booking.items as { deposit: number } | null)?.deposit ?? 0,
  );
  const intent = await createPaymentIntent({
    amountCentavos: Math.round(deposit * 100),
    description: `Deposit for ${booking.reference}`,
    metadata: { booking_id: booking.id, reference: booking.reference },
  });

  const { error: insertError } = await serviceClient.from('payments').insert({
    booking_id: booking.id,
    type: 'deposit',
    amount: deposit,
    status: 'processing',
    paymongo_payment_intent_id: intent.id,
  });
  if (insertError) {
    return jsonResponse({ error: insertError.message }, { status: 500 });
  }

  return jsonResponse(
    { clientKey: intent.attributes.client_key, paymentIntentId: intent.id },
    { status: 200 },
  );
});
