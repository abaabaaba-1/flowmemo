import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateAIText } from "@/lib/ai/text-provider";
import { DEMO_CHAT_PROMPTS, DEMO_PIPELINE_INPUTS } from "@/lib/demo-data";

type PromptIntent = "ask" | "note";

interface PromptSuggestion {
  intent: PromptIntent;
  label: string;
  text: string;
}

interface MessageInput {
  role?: string;
  content?: string;
  kind?: string;
}

interface NoteInput {
  title?: string;
  location?: string | null;
  userRawText?: string | null;
  aiContent?: string | null;
  keywords?: string[] | null;
}

const FALLBACK_SUGGESTIONS: PromptSuggestion[] = [
  ...DEMO_CHAT_PROMPTS.map((text) => ({
    intent: "ask" as const,
    label: compactLabel(text),
    text,
  })),
  ...DEMO_PIPELINE_INPUTS.slice(0, 2).map((sample) => ({
    intent: "note" as const,
    label: `记：${sample.label}`,
    text: sample.text,
  })),
];

function compactLabel(value: string, maxLength = 14) {
  const text = value.trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function compactText(value: unknown, maxLength = 180) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function safeMessages(value: unknown): MessageInput[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((message) => {
      if (!message || typeof message !== "object") return null;
      const item = message as MessageInput;
      return {
        role: typeof item.role === "string" ? item.role : "",
        kind: typeof item.kind === "string" ? item.kind : "",
        content: compactText(item.content, 220),
      };
    })
    .filter(Boolean) as MessageInput[];
}

function safeNotes(value: unknown): NoteInput[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((note) => {
      if (!note || typeof note !== "object") return null;
      const item = note as NoteInput;
      return {
        title: compactText(item.title, 60),
        location: compactText(item.location, 40),
        userRawText: compactText(item.userRawText, 160),
        aiContent: compactText(item.aiContent, 160),
        keywords: Array.isArray(item.keywords)
          ? item.keywords.map((keyword) => compactText(keyword, 16)).filter(Boolean).slice(0, 6)
          : [],
      };
    })
    .filter(Boolean) as NoteInput[];
}

function parseJsonPayload(text: string) {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(match?.[0] ?? cleaned) as unknown;
}

function normalizeSuggestions(payload: unknown): PromptSuggestion[] {
  const suggestions =
    payload && typeof payload === "object" && "suggestions" in payload
      ? (payload as { suggestions?: unknown }).suggestions
      : payload;

  if (!Array.isArray(suggestions)) return [];

  const seen = new Set<string>();
  const normalized: PromptSuggestion[] = [];

  for (const suggestion of suggestions) {
    if (!suggestion || typeof suggestion !== "object") continue;
    const item = suggestion as { intent?: unknown; label?: unknown; text?: unknown };
    const intent = item.intent === "note" ? "note" : item.intent === "ask" ? "ask" : null;
    const text = compactText(item.text, 90);
    const label = compactLabel(String(item.label ?? text), intent === "note" ? 12 : 16);
    const key = `${intent}:${text}`;

    if (!intent || !text || !label || seen.has(key)) continue;
    seen.add(key);
    normalized.push({ intent, label, text });
  }

  return normalized.slice(0, 5);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    destination = "旅途中",
    messages,
    notes,
    demoMode = false,
  } = body;

  if (!demoMode) {
    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;
  }

  const recentMessages = safeMessages(messages).slice(-8);
  const recentNotes = safeNotes(notes).slice(-6);
  const messageSummary = recentMessages
    .map((message, index) => `${index + 1}. ${message.role || "unknown"}${message.kind ? `/${message.kind}` : ""}: ${message.content}`)
    .join("\n");
  const noteSummary = recentNotes
    .map((note, index) => {
      const content = note.userRawText || note.aiContent || note.title || "";
      const keywords = note.keywords?.length ? `；关键词：${note.keywords.join("、")}` : "";
      return `${index + 1}. ${note.location ? `${note.location}：` : ""}${content}${keywords}`;
    })
    .join("\n");

  try {
    const content = await generateAIText(
      [
        {
          role: "system",
          content: `你是 Conch 聊天页的动态快捷回复引擎。Conch 的概念是把回忆像海螺里的海声一样重现。你要根据旅程、最近对话和已记录的 Pocket 笔记，生成输入栏上方的快捷回复。

要求：
- 输出 5 个中文提示词，直接可点击使用。
- intent 为 "ask" 表示问旅行助手，适合路线、餐厅、穿搭、天气、备选方案、整理建议。
- intent 为 "note" 表示写入 Pocket，适合引导用户补充声音、气味、心情、人物、照片线索。
- ask 和 note 都要出现，优先 3 个 ask、2 个 note。
- label 短一些，适合手机胶囊按钮；text 是点击后真正发送或写入的完整文本。
- 不要重复最近已经问过或记录过的内容。
- 只输出 JSON，不要解释。

JSON 格式：
{
  "suggestions": [
    { "intent": "ask", "label": "附近早餐", "text": "帮我安排附近早餐和散步路线" },
    { "intent": "note", "label": "记：海风", "text": "刚才海风是什么感觉？我想把气味、声音和心情记进 Pocket。" }
  ]
}`,
        },
        {
          role: "user",
          content: `旅程目的地：${destination || "旅途中"}
最近对话：
${messageSummary || "暂无"}

已记录 Pocket：
${noteSummary || "暂无"}`,
        },
      ],
      {
        maxTokens: 520,
        temperature: 0.76,
        responseFormat: { type: "json_object" },
      }
    );

    const normalized = normalizeSuggestions(parseJsonPayload(content));
    return Response.json({
      suggestions: normalized.length ? normalized : FALLBACK_SUGGESTIONS,
    });
  } catch {
    return Response.json({ suggestions: FALLBACK_SUGGESTIONS });
  }
}
