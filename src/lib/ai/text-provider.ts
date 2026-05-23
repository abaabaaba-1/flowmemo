import { ai } from "@eazo/sdk";

type Role = "system" | "user" | "assistant";

export interface AITextMessage {
  role: Role;
  content: string;
}

interface AITextOptions {
  maxTokens?: number;
  temperature?: number;
  responseFormat?: { type: "json_object" };
}

interface DeepSeekResponse {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
}

const EAZO_MODEL = "deepseek.v3.1";
const DEEPSEEK_MODEL = "deepseek-v4-pro";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

if (process.env.EAZO_PRIVATE_KEY) {
  ai.configure({ privateKey: process.env.EAZO_PRIVATE_KEY });
}

function shouldUseExternalDeepSeek() {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === "eazo") return false;
  if (provider === "deepseek") return true;
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

function getDeepSeekConfig() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is required when AI_PROVIDER=deepseek");
  }

  return {
    apiKey,
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? DEEPSEEK_BASE_URL,
    model: process.env.DEEPSEEK_MODEL ?? DEEPSEEK_MODEL,
  };
}

async function callDeepSeek(
  messages: AITextMessage[],
  options: AITextOptions & { stream: boolean }
) {
  const { apiKey, baseUrl, model } = getDeepSeekConfig();

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: options.stream,
      thinking: { type: "disabled" },
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      response_format: options.responseFormat,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`DeepSeek API failed: ${res.status} ${detail.slice(0, 240)}`);
  }

  return res;
}

async function streamDeepSeekText(
  messages: AITextMessage[],
  options: AITextOptions
) {
  const res = await callDeepSeek(messages, { ...options, stream: true });
  if (!res.body) throw new Error("DeepSeek API returned an empty stream");

  const upstream = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await upstream.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const parsed = JSON.parse(payload) as {
                choices?: { delta?: { content?: string } }[];
              };
              const delta = parsed.choices?.[0]?.delta?.content ?? "";
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // Ignore SSE control lines that are not completion chunks.
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}

async function streamEazoText(messages: AITextMessage[]) {
  const stream = await ai.chat({
    model: EAZO_MODEL,
    messages,
    stream: true,
  });

  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) controller.enqueue(encoder.encode(delta));
        }
      } finally {
        controller.close();
      }
    },
  });
}

export async function streamAIText(
  messages: AITextMessage[],
  options: AITextOptions = {}
) {
  if (shouldUseExternalDeepSeek()) {
    return streamDeepSeekText(messages, options);
  }

  return streamEazoText(messages);
}

export async function generateAIText(
  messages: AITextMessage[],
  options: AITextOptions = {}
) {
  if (shouldUseExternalDeepSeek()) {
    const res = await callDeepSeek(messages, { ...options, stream: false });
    const data = (await res.json()) as DeepSeekResponse;
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  }

  const result = await ai.chat({
    model: EAZO_MODEL,
    messages,
  });
  return result.choices[0].message.content?.trim() ?? "";
}
