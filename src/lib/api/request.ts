/**
 * Drop-in replacement for `fetch` that automatically injects `x-eazo-session`.
 * The SDK resolves the current session header from either the host bridge
 * (Eazo Mobile) or localStorage (web).
 */
export async function request(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  if (process.env.NEXT_PUBLIC_FLOWMEMO_RUNTIME === "local") {
    return fetch(input, init);
  }

  const { auth } = await import("@eazo/sdk");
  const sessionHeader = await auth.getSessionHeader();

  return fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      ...(sessionHeader ? { "x-eazo-session": sessionHeader } : {}),
    },
  });
}
