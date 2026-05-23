import { NextRequest, NextResponse } from "next/server";
import { ai } from "@eazo/sdk";
import { requireAuth } from "@/lib/auth";
import { DEMO_ITINERARY_IMPORT } from "@/lib/demo-data";

if (process.env.EAZO_PRIVATE_KEY) {
  ai.configure({ privateKey: process.env.EAZO_PRIVATE_KEY });
}

function fallbackImport() {
  return DEMO_ITINERARY_IMPORT;
}

function parseJSON(text: string) {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(match?.[0] ?? cleaned) as {
    destination?: string;
    startDate?: string;
    endDate?: string;
    title?: string;
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { imageBase64, mimeType = "image/jpeg", demoMode = false } = body;

  if (!demoMode) {
    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;
  }

  if (!imageBase64 || !process.env.EAZO_PRIVATE_KEY || process.env.AI_PROVIDER === "deepseek") {
    return NextResponse.json(fallbackImport());
  }

  try {
    const dataUrl = `data:${mimeType};base64,${imageBase64}`;
    const result = await ai.chat({
      model: "qwen.qwen3-vl-235b-a22b-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `请从这张旅行行程截图、机票或表单中识别旅程信息，只返回 JSON：
{
  "destination": "大范围目的地或主要城市，用中文，必要时用 · 连接",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "title": "不超过 12 字的旅程标题"
}
如果看不清日期，按截图中最可能的旅行日期推断。`,
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    });

    const parsed = parseJSON(result.choices[0].message.content ?? "{}");
    if (!parsed.destination || !parsed.startDate || !parsed.endDate) {
      return NextResponse.json(fallbackImport());
    }

    return NextResponse.json({
      destination: parsed.destination,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      title: parsed.title ?? parsed.destination,
    });
  } catch {
    return NextResponse.json(fallbackImport());
  }
}
