// supabase/functions/admin-refund-booking/index.ts
//
// Reject or shop-initiated cancel, for a booking whose deposit is already
// paid. Refunds first, then transitions the booking, in one call — so a
// booking can never end up rejected/cancelled-by-shop with an unrefunded
// deposit, which two separate client calls could leave behind if the second
// one failed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { refundPayment } from '../_shared/paymongo.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing Authorization header' }),
      {
        status: 401,
      },
    );
  }

  const { reference, action, reason } = await req.json();
  if (!reference || !['reject', 'cancel'].includes(action) || !reason?.trim()) {
    return new Response(
      JSON.stringify({
        error: 'reference, action (reject|cancel), and reason are required',
      }),
      { status: 400 },
    );
  }

  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: isAdmin } = await callerClient.rpc('is_admin');
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Admin only' }), {
      status: 403,
    });
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: booking, error: bookingError } = await db
    .from('bookings')
    .select('id')
    .eq('reference', reference)
    .maybeSingle();
  if (bookingError)
    return new Response(JSON.stringify({ error: bookingError.message }), {
      status: 500,
    });
  if (!booking)
    return new Response(JSON.stringify({ error: 'Booking not found' }), {
      status: 404,
    });

  const { data: payment } = await db
    .from('payments')
    .select('id, amount, paymongo_payment_id')
    .eq('booking_id', booking.id)
    .eq('type', 'deposit')
    .eq('status', 'paid')
    .maybeSingle();

  if (payment?.paymongo_payment_id) {
    const refund = await refundPayment({
      paymongoPaymentId: payment.paymongo_payment_id,
      amountCentavos: Math.round(Number(payment.amount) * 100),
      reason: 'others',
      notes: reason,
    });
    await db
      .from('payments')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        refund_reason: reason,
      })
      .eq('id', payment.id);
    if (refund.status !== 'succeeded' && refund.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Refund did not succeed: ${refund.status}` }),
        {
          status: 502,
        },
      );
    }
  }

  const patch: Record<string, unknown> = {
    status: action === 'reject' ? 'rejected' : 'cancelled',
  };
  if (action === 'reject') patch.rejection_reason = reason;

  const { error: updateError } = await db
    .from('bookings')
    .update(patch)
    .eq('id', booking.id);
  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
