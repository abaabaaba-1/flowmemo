import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateAIText, streamAIText } from "@/lib/ai/text-provider";
import { sanitizeDemoCapsuleDraft } from "@/lib/demo-guardrails";

const STYLE_PROMPTS: Record<string, string> = {
  cinematic: "用电影旁白的语气，沉浸、深邃、有画面感，像导演在讲述一个旅行故事",
  healing: "用治愈系的语气，温柔、自然、治愈人心，让读者感受到旅途的安静与美好",
  xiaohongshu: "用小红书博主的语气，活泼、亲切、有感染力，但不要过度营销",
  poetic: "用诗意散文的语气，意境悠远、文字优美，像一首现代诗",
  funny: "用轻松吐槽的语气，幽默风趣、自嘲带笑，像在和朋友分享旅途趣事",
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userText, style = "cinematic", existingContent, demoMode = false } = body;

  if (!demoMode) {
    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;
  }

  if (!userText?.trim() && !existingContent?.trim()) {
    return new Response("缺少文本内容", { status: 400 });
  }

  const stylePrompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.cinematic;

  let systemPrompt: string;
  let userMessage: string;

  if (existingContent) {
    systemPrompt = `你是 Conch 的 AI 旅行回响导演。Conch 会像海螺重现海声一样，把旅行回忆重新唤起。请把以下旅行文案改写成新风格。
要求：
- ${stylePrompt}
- 保留原文的核心事件、地点和情绪信息
- 字数控制在 80-150 字之间
- 直接输出改写后的文案，不要添加解释`;

    userMessage = `原文：${existingContent}`;
  } else {
    systemPrompt = `你是 Conch 的 AI 旅行回响导演。Conch 会像海螺重现海声一样，把旅行回忆重新唤起。根据用户的旅行碎碎念，生成一段旅行记忆文案。
你需要提取：
1. 地点信息，如果没有则留空
2. 场景关键词，最多 5 个词
3. 记忆胶囊标题，简短有诗意，不超过 12 字
4. 旅行文案，${stylePrompt}，80-150 字

请严格按以下 JSON 格式输出，不要有任何额外内容：
{
  "title": "记忆胶囊标题",
  "location": "地点",
  "keywords": ["关键词", "关键词", "关键词"],
  "content": "旅行文案内容"
}`;

    userMessage = userText;
  }

  if (demoMode && !existingContent) {
    let content = "";
    try {
      content = await generateAIText(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        {
          maxTokens: 480,
          temperature: 0.82,
          responseFormat: { type: "json_object" },
        }
      );
    } catch {
      content = "{}";
    }

    let draft: {
      title?: string;
      location?: string;
      keywords?: string[];
      content?: string;
    } = {};

    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      draft = JSON.parse(match?.[0] ?? cleaned);
    } catch {
      draft = {};
    }

    const safeDraft = sanitizeDemoCapsuleDraft(userText, draft);
    return new Response(JSON.stringify(safeDraft, null, 2), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const readable = await streamAIText(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    {
      maxTokens: existingContent ? 260 : 480,
      temperature: 0.82,
      responseFormat: existingContent ? undefined : { type: "json_object" },
    }
  );

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
