import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateAIText } from "@/lib/ai/text-provider";

interface CapsuleInput {
  title?: string;
  location?: string | null;
  userRawText?: string | null;
  aiContent?: string | null;
  keywords?: string[] | null;
  photoCount?: number | null;
}

function fallbackNotes(capsules: CapsuleInput[]) {
  const latest = capsules.at(-1);
  const keywords = [
    ...new Set(capsules.flatMap((c) => c.keywords ?? []).filter(Boolean)),
  ].slice(0, 4);

  return {
    storyArc:
      capsules.length >= 3
        ? "今天已经有开场、细节和收束，可以直接生成完整画卷。"
        : "素材已经开始成形，还需要一个更有画面感的瞬间来补足故事。",
    socialHook: latest?.aiContent?.slice(0, 42) || latest?.title || "把旅途碎片交给 AI，生成一张能分享的今日画卷。",
    missingShot:
      capsules.some((c) => (c.photoCount ?? 0) > 0)
        ? "补一句当时的声音或气味，让照片从好看变成有记忆点。"
        : "补一张环境照片作为封面，最好有光线、路牌或人物背影。",
    nextPrompt: keywords.length
      ? `围绕「${keywords.join("、")}」再说一句你当时的感受。`
      : "刚才那个瞬间，最让你想记住的细节是什么？",
    score: Math.min(92, 48 + capsules.length * 14),
  };
}

function parseJsonObject(text: string) {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractAnchors(destination: string | undefined, capsules: CapsuleInput[]) {
  return [
    destination,
    ...capsules.flatMap((capsule) => [
      capsule.title,
      capsule.location,
      capsule.userRawText,
      ...(capsule.keywords ?? []),
    ]),
  ]
    .flatMap((value) => String(value ?? "").split(/[，。、《》\s·｜|/]+/))
    .map((value) => value.trim())
    .filter((value) => value.length >= 2)
    .slice(0, 24);
}

function isRelevantNotes(notes: Record<string, unknown>, anchors: string[]) {
  const text = [
    notes.storyArc,
    notes.socialHook,
    notes.missingShot,
    notes.nextPrompt,
  ].join(" ");

  return anchors.some((anchor) => text.includes(anchor));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { journeyId, destination, capsules = [] } = body as {
    journeyId?: string;
    destination?: string;
    capsules?: CapsuleInput[];
  };

  const isDemoMode = journeyId === "demo-journey-izu";
  if (!isDemoMode) {
    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;
  }

  if (!Array.isArray(capsules) || capsules.length === 0) {
    return NextResponse.json(fallbackNotes([]));
  }

  const compactCapsules = capsules.slice(-6).map((capsule, index) => ({
    idx: index + 1,
    title: capsule.title,
    location: capsule.location,
    userRawText: capsule.userRawText,
    aiContent: capsule.aiContent,
    keywords: capsule.keywords,
    photoCount: capsule.photoCount,
  }));

  try {
    const raw = await generateAIText(
      [
        {
          role: "system",
          content: `你是织流 FlowMemo 的 AI 旅行记忆导演。你要阅读用户今天收集的旅行记忆胶囊，输出导演台建议。
严格输出 JSON，不要解释：
{
  "storyArc": "今天的故事线判断，40字以内",
  "socialHook": "最适合社交平台传播的一句话，45字以内",
  "missingShot": "建议用户接下来补拍或补说的素材，45字以内",
  "nextPrompt": "对用户的自然追问，35字以内",
  "score": 0到100之间的整数，表示今日画卷完成度"
}`,
        },
        {
          role: "user",
          content: `目的地：${destination ?? "旅途中"}\n记忆胶囊：${JSON.stringify(compactCapsules)}`,
        },
      ],
      {
        maxTokens: 360,
        temperature: 0.72,
        responseFormat: { type: "json_object" },
      }
    );

    const parsed = parseJsonObject(raw);
    if (!parsed) {
      return NextResponse.json(fallbackNotes(capsules));
    }

    if (!isRelevantNotes(parsed, extractAnchors(destination, capsules))) {
      return NextResponse.json(fallbackNotes(capsules));
    }

    return NextResponse.json({
      storyArc: String(parsed.storyArc ?? fallbackNotes(capsules).storyArc),
      socialHook: String(parsed.socialHook ?? fallbackNotes(capsules).socialHook),
      missingShot: String(parsed.missingShot ?? fallbackNotes(capsules).missingShot),
      nextPrompt: String(parsed.nextPrompt ?? fallbackNotes(capsules).nextPrompt),
      score: Math.max(0, Math.min(100, Number(parsed.score ?? fallbackNotes(capsules).score))),
    });
  } catch {
    return NextResponse.json(fallbackNotes(capsules));
  }
}
