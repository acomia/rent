// supabase/functions/paymongo-return/index.ts
//
// PayMongo requires `return_url` to be a reachable https:// URL — a raw
// `renta://` custom scheme is rejected outright ("return_url format is
// invalid"). This function is that https URL: PayMongo's gateway redirects
// the in-app browser here after the customer authenticates or cancels, and
// this immediately bounces it into the app's own deep link, which is what
// `WebBrowser.openAuthSessionAsync`'s callback-scheme matching actually
// watches for (see `reserve/payment.tsx`). No payment data is read or
// written here — the webhook is still the only source of truth for status.
//
// Public endpoint by nature (a browser redirect, not an API call from the
// app), so no JWT is expected — deployed with verify_jwt: false, same as
// paymongo-webhook.

Deno.serve((_req: Request) => {
  return new Response(null, {
    status: 302,
    headers: { Location: 'renta://reserve/payment' },
  });
});
