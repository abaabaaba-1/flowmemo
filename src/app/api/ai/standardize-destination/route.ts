import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateAIText } from "@/lib/ai/text-provider";
import {
  standardizeDestinationLocal,
  type DestinationInput,
} from "@/lib/destination";

function parseJSON(text: string): Partial<DestinationInput> {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(match?.[0] ?? cleaned) as Partial<DestinationInput>;
}

function mergeStandardizedInput(
  original: DestinationInput,
  parsed: Partial<DestinationInput>,
  fallback: DestinationInput
): DestinationInput {
  return {
    destination: parsed.destination || original.destination || fallback.destination,
    destinationCountryRegion:
      parsed.destinationCountryRegion ||
      original.destinationCountryRegion ||
      fallback.destinationCountryRegion,
    destinationCity:
      parsed.destinationCity || original.destinationCity || fallback.destinationCity,
    destinationPlace:
      parsed.destinationPlace || original.destinationPlace || fallback.destinationPlace,
    destinationNote:
      parsed.destinationNote || original.destinationNote || fallback.destinationNote,
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { demoMode = false, ...input } = body as DestinationInput & { demoMode?: boolean };

  if (!demoMode) {
    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;
  }

  const fallback = standardizeDestinationLocal(input);
  if (!fallback.destination) {
    return NextResponse.json({ error: "目的地不能为空" }, { status: 400 });
  }

  if (demoMode) {
    return NextResponse.json(fallback);
  }

  try {
    const content = await generateAIText(
      [
        {
          role: "system",
          content: `你是旅行地点标准化器。把用户输入的旅行目的地整理成结构化 JSON。
要求：
- 只输出 JSON，不要解释。
- 不要编造门牌号、酒店名或用户没有提供的精确地址。
- 缺失字段用空字符串。
- destination 是展示用标题，按 国家/地区 · 城市/区域 · 具体地点 拼接。`,
        },
        {
          role: "user",
          content: JSON.stringify({
            destination: input.destination ?? "",
            destinationCountryRegion: input.destinationCountryRegion ?? "",
            destinationCity: input.destinationCity ?? "",
            destinationPlace: input.destinationPlace ?? "",
            destinationNote: input.destinationNote ?? "",
            outputShape: {
              destinationCountryRegion: "国家/地区",
              destinationCity: "城市或区域",
              destinationPlace: "具体地点、景区、街区或路线",
              destinationNote: "用户补充的自由描述",
              destination: "展示用标题",
            },
          }),
        },
      ],
      {
        maxTokens: 260,
        temperature: 0.1,
        responseFormat: { type: "json_object" },
      }
    );

    const parsed = parseJSON(content);
    const standardized = standardizeDestinationLocal(
      mergeStandardizedInput(input, parsed, fallback)
    );
    return NextResponse.json(standardized.destination ? standardized : fallback);
  } catch {
    return NextResponse.json(fallback);
  }
}
