import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ai } from "@eazo/sdk";

ai.configure({ privateKey: process.env.EAZO_PRIVATE_KEY! });

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { imageBase64, mimeType = "image/jpeg" } = body;

  if (!imageBase64) {
    return NextResponse.json({ error: "缺少图片数据" }, { status: 400 });
  }

  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  const result = await ai.chat({
    model: "qwen.qwen3-vl-235b-a22b-instruct",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `请分析这张旅行照片，提取以下信息，严格以JSON格式输出，不要有任何额外内容：
{
  "scene": "场景描述（10字以内）",
  "tags": ["标签1", "标签2", "标签3"],
  "mood": "情绪氛围（如：宁静、欢乐、壮阔等）",
  "suggestedCaption": "适合配在旅行手账上的一句话（20字以内）"
}`,
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const rawText = result.choices[0].message.content ?? "{}";

  // 解析 JSON，处理可能的 markdown code block
  let parsed: Record<string, unknown> = {};
  try {
    const cleaned = rawText.replace(/```json\n?|\n?```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = { scene: "旅行场景", tags: ["旅行"], mood: "美好", suggestedCaption: "旅途中的美丽瞬间" };
  }

  return NextResponse.json(parsed);
}
