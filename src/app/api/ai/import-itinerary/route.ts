import { NextRequest, NextResponse } from "next/server";
import { ai } from "@eazo/sdk";
import { requireAuth } from "@/lib/auth";
import { DEMO_ITINERARY_IMPORT } from "@/lib/demo-data";
import { standardizeDestinationLocal } from "@/lib/destination";
import { validateImageBase64Payload } from "@/lib/media-validation";

if (process.env.EAZO_PRIVATE_KEY) {
  ai.configure({ privateKey: process.env.EAZO_PRIVATE_KEY });
}

function fallbackImport() {
  const standardized = standardizeDestinationLocal(DEMO_ITINERARY_IMPORT);
  return {
    ...DEMO_ITINERARY_IMPORT,
    ...standardized,
    title: DEMO_ITINERARY_IMPORT.title,
  };
}

function parseJSON(text: string) {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(match?.[0] ?? cleaned) as {
    destination?: string;
    destinationCountryRegion?: string;
    destinationCity?: string;
    destinationPlace?: string;
    destinationNote?: string;
    startDate?: string;
    endDate?: string;
    title?: string;
  };
}

function hasValidDateRange(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return false;
  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);
  if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
    return false;
  }
  return parsedEndDate.getTime() >= parsedStartDate.getTime();
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { imageBase64, mimeType = "image/jpeg", demoMode = false } = body;

  if (!demoMode) {
    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;
  }

  const imageValidation = validateImageBase64Payload({ imageBase64, mimeType });
  if (!imageValidation.ok) {
    return NextResponse.json(
      { error: imageValidation.error },
      { status: imageValidation.status }
    );
  }

  if (demoMode) {
    return NextResponse.json(fallbackImport());
  }

  if (!process.env.EAZO_PRIVATE_KEY || process.env.AI_PROVIDER === "deepseek") {
    return NextResponse.json({ error: "当前环境不支持行程图片识别" }, { status: 503 });
  }

  try {
    const dataUrl = `data:${imageValidation.mimeType};base64,${imageValidation.imageBase64}`;
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
  "destinationCountryRegion": "国家或地区，用中文；未知则空字符串",
  "destinationCity": "城市或区域，用中文；未知则空字符串",
  "destinationPlace": "具体地点、景区、街区或路线，用中文，必要时用 · 连接；未知则空字符串",
  "destinationNote": "用户行程里的补充描述；没有则空字符串",
  "destination": "展示用目的地标题，按 国家/地区 · 城市/区域 · 具体地点 拼接",
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
    const standardized = standardizeDestinationLocal(parsed);
    if (!standardized.destination || !hasValidDateRange(parsed.startDate, parsed.endDate)) {
      return NextResponse.json({ error: "未识别到有效行程信息" }, { status: 422 });
    }

    return NextResponse.json({
      ...standardized,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      title: parsed.title ?? standardized.destination,
    });
  } catch {
    return NextResponse.json({ error: "识别行程失败" }, { status: 500 });
  }
}
