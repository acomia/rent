// Every JSON response from a payment edge function needs `Content-Type:
// application/json`, or the Supabase client SDK's `functions.invoke()` hands
// the caller the raw response text instead of a parsed object — silently,
// with no error, so every downstream property access reads `undefined`
// (traced from a live "client_key is required" PayMongo error back to a
// `create-payment-intent` response with no Content-Type header).

export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
}
