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

export async function parseJsonResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : fallbackMessage;
    throw new Error(message);
  }
  return body as T;
}

export async function readTextResponse(
  response: Response,
  fallbackMessage: string,
  onChunk?: (chunk: string, fullText: string) => void
): Promise<string> {
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || fallbackMessage);
  }

  if (!response.body) {
    return response.text();
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    text += chunk;
    onChunk?.(chunk, text);
  }

  return text;
}
