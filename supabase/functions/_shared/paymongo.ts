// Server-side PayMongo REST wrapper. Never import this from client code — it
// signs requests with the secret key, which must only ever live as an edge
// function secret (PAYMONGO_SECRET_KEY), never in EXPO_PUBLIC_*.
//
// This has not been exercised against a live PayMongo account yet (none
// exists as of this plan) — re-confirm field names against PayMongo's current
// API reference (https://developers.paymongo.com/reference) before relying on
// it against real traffic.

const PAYMONGO_API = 'https://api.paymongo.com/v1';

function secretAuthHeader(): string {
  const key = Deno.env.get('PAYMONGO_SECRET_KEY');
  if (!key) throw new Error('PAYMONGO_SECRET_KEY is not set');
  return `Basic ${btoa(`${key}:`)}`;
}

export type PaymongoIntent = {
  id: string;
  attributes: { client_key: string; status: string };
};

export async function createPaymentIntent(input: {
  amountCentavos: number;
  description: string;
  metadata: Record<string, string>;
}): Promise<PaymongoIntent> {
  const res = await fetch(`${PAYMONGO_API}/payment_intents`, {
    method: 'POST',
    headers: {
      Authorization: secretAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: input.amountCentavos,
          currency: 'PHP',
          description: input.description,
          metadata: input.metadata,
          payment_method_allowed: ['card', 'gcash', 'grab_pay', 'paymaya'],
          payment_method_options: { card: { request_three_d_secure: 'any' } },
          capture_type: 'automatic',
        },
      },
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `PayMongo create_payment_intent failed: ${JSON.stringify(json)}`,
    );
  }
  return json.data as PaymongoIntent;
}

export async function refundPayment(input: {
  paymongoPaymentId: string;
  amountCentavos: number;
  reason: 'requested_by_customer' | 'others';
  notes: string;
}): Promise<{ id: string; status: string }> {
  const res = await fetch(`${PAYMONGO_API}/refunds`, {
    method: 'POST',
    headers: {
      Authorization: secretAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: input.amountCentavos,
          payment_id: input.paymongoPaymentId,
          reason: input.reason,
          notes: input.notes,
        },
      },
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`PayMongo refund failed: ${JSON.stringify(json)}`);
  }
  return { id: json.data.id, status: json.data.attributes.status };
}

/**
 * Verifies the `Paymongo-Signature` header: `t=<unix ts>,te=<test hmac>,
 * li=<live hmac>`, each an HMAC-SHA256 of `${t}.${rawBody}` keyed on the
 * webhook secret, hex-encoded. Matches against either `te` or `li` since we
 * don't know in advance which mode fired.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const secret = Deno.env.get('PAYMONGO_WEBHOOK_SECRET');
  if (!secret) throw new Error('PAYMONGO_WEBHOOK_SECRET is not set');

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => p.split('=') as [string, string]),
  );
  const timestamp = parts.t;
  const testSig = parts.te;
  const liveSig = parts.li;
  if (!timestamp || (!testSig && !liveSig)) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  const computed = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return computed === testSig || computed === liveSig;
}
