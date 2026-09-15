// supabase/functions/paymongo-webhook/index.ts
//
// The only place a deposit is ever marked paid. Public endpoint — PayMongo
// calls this directly, so trust comes from the signature, not a user JWT.
//
// The event payload shape below (`data.attributes.type` /
// `data.attributes.data.attributes.payment_intent_id`) is PayMongo's
// documented envelope as of writing this plan; re-confirm against a captured
// real delivery once test-mode keys exist and this has actually received one
// — no PayMongo account exists yet to verify it against.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { refundPayment, verifyWebhookSignature } from '../_shared/paymongo.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('Paymongo-Signature');
  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
    });
  }

  const event = JSON.parse(rawBody);
  const eventId: string = event.data.id;
  const eventType: string = event.data.attributes.type;
  const resource = event.data.attributes.data;
  const paymentIntentId: string | undefined =
    resource?.attributes?.payment_intent_id ?? resource?.attributes?.data?.id;

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Dedupe first. A unique-violation here means this delivery was already
  // processed — webhooks retry and can arrive twice or out of order.
  const { error: dedupeError } = await db
    .from('payment_events')
    .insert({ id: eventId });
  if (dedupeError) {
    return new Response(JSON.stringify({ ok: true, duplicate: true }), {
      status: 200,
    });
  }

  if (!paymentIntentId) {
    return new Response(
      JSON.stringify({ ok: true, ignored: 'no payment_intent_id' }),
      {
        status: 200,
      },
    );
  }

  const { data: payment } = await db
    .from('payments')
    .select('id, booking_id, amount')
    .eq('paymongo_payment_intent_id', paymentIntentId)
    .eq('type', 'deposit')
    .maybeSingle();

  if (!payment) {
    return new Response(
      JSON.stringify({ ok: true, ignored: 'unknown payment_intent_id' }),
      {
        status: 200,
      },
    );
  }

  if (eventType === 'payment.paid') {
    await db
      .from('payments')
      .update({
        status: 'paid',
        paymongo_payment_id: resource.id,
        paid_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    const { data: advanced } = await db
      .from('bookings')
      .update({ status: 'pending' })
      .eq('id', payment.booking_id)
      .eq('status', 'hold')
      .select('id');

    if (!advanced || advanced.length === 0) {
      // The hold was already swept before this webhook landed — rare, since
      // Task 1's guard skips the sweep while a payment is 'processing', but
      // not impossible if the webhook itself was unusually slow. The
      // customer paid for a slot that's gone: refund in full.
      const refund = await refundPayment({
        paymongoPaymentId: resource.id,
        amountCentavos: Math.round(Number(payment.amount) * 100),
        reason: 'others',
        notes: 'Hold expired before payment confirmation could land',
      });
      await db
        .from('payments')
        .update({
          status: 'refunded',
          refunded_at: new Date().toISOString(),
          refund_reason: 'Hold expired before payment confirmation could land',
        })
        .eq('id', payment.id);
      return new Response(JSON.stringify({ ok: true, refunded: refund.id }), {
        status: 200,
      });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  if (eventType === 'payment.failed') {
    // Leave the hold running — the customer can retry with another method
    // before the countdown actually runs out.
    await db.from('payments').update({ status: 'failed' }).eq('id', payment.id);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  return new Response(JSON.stringify({ ok: true, ignored: eventType }), {
    status: 200,
  });
});
