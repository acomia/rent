// src/lib/paymongo.ts
//
// Client-side PayMongo calls. Both of these are safe to make directly from
// the app: `createPaymentMethod` is signed with the PUBLIC key (that's what
// it's for), and `attachPaymentMethod` is authorized by the intent's
// `client_key`, not the secret key — PayMongo designed both for client use so
// a checkout can complete without a server round trip for every step.

import { env } from '@/lib/env';

const PAYMONGO_API = 'https://api.paymongo.com/v1';

function publicAuthHeader(): string {
  return `Basic ${btoa(`${env.paymongoPublicKey}:`)}`;
}

export type PaymentMethodType = 'gcash' | 'grab_pay' | 'paymaya' | 'card';

export async function createPaymentMethod(input: {
  type: PaymentMethodType;
  billing: { name: string; email: string; phone: string };
}): Promise<{ id: string }> {
  const res = await fetch(`${PAYMONGO_API}/payment_methods`, {
    method: 'POST',
    headers: {
      Authorization: publicAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: { attributes: { type: input.type, billing: input.billing } },
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      json.errors?.[0]?.detail ?? 'Could not start that payment method.',
    );
  }
  return { id: json.data.id as string };
}

export async function attachPaymentMethod(input: {
  paymentIntentId: string;
  clientKey: string;
  paymentMethodId: string;
  returnUrl: string;
}): Promise<{ status: string; redirectUrl: string | null }> {
  const res = await fetch(
    `${PAYMONGO_API}/payment_intents/${input.paymentIntentId}/attach`,
    {
      method: 'POST',
      headers: {
        Authorization: publicAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method: input.paymentMethodId,
            client_key: input.clientKey,
            return_url: input.returnUrl,
          },
        },
      }),
    },
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      json.errors?.[0]?.detail ?? 'Payment could not be started.',
    );
  }
  return {
    status: json.data.attributes.status as string,
    redirectUrl: json.data.attributes.next_action?.redirect?.url ?? null,
  };
}
