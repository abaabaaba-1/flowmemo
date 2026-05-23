import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCapsulesByJourney } from "@/lib/db/queries/capsules";
import { getJourneyById } from "@/lib/db/queries/journeys";
import { generateAIText, streamAIText } from "@/lib/ai/text-provider";
import { dateKeyToDate, toDateKey } from "@/lib/journey-date";

type CanvasCapsule = {
  title: string;
  location?: string | null;
  keywords?: string[] | null;
  aiContent?: string | null;
  userRawText?: string | null;
};

function capsuleText(capsule: CanvasCapsule) {
  return capsule.aiContent || capsule.userRawText || capsule.title || "";
}

function extractAnchors(destination: string, capsules: CanvasCapsule[]) {
  const values = [
    destination,
    ...capsules.flatMap((capsule) => [
      capsule.title,
      capsule.location,
      capsule.aiContent,
      capsule.userRawText,
      ...(capsule.keywords ?? []),
    ]),
  ];

  return [
    ...new Set(
      values
        .flatMap((value) => String(value ?? "").split(/[\s，。、“”‘’：:；;、|/（）()《》]+/))
        .map((value) => value.trim())
        .filter((value) => value.length >= 2)
    ),
  ].slice(0, 30);
}

function isRelevantJournal(text: string, destination: string, capsules: CanvasCapsule[]) {
  if (text.trim().length < 80) return false;

  const anchors = extractAnchors(destination, capsules);
  const matchCount = anchors.reduce((count, anchor) => {
    return text.includes(anchor) ? count + 1 : count;
  }, 0);

  return matchCount >= Math.min(2, Math.max(1, anchors.length));
}

function fallbackJournal(destination: string, capsules: CanvasCapsule[], style: string) {
  const styleLead: Record<string, string> = {
    cinematic: "镜头从今天的旅程缓缓推近",
    healing: "今天最珍贵的，是那些让人慢下来的细节",
    xiaohongshu: "今天这条路线很适合做成旅行手账",
    poetic: "旅程把一些很轻的瞬间留了下来",
    funny: "今天的素材已经多到可以直接剪片",
  };

  const selected = capsules.slice(-5);
  const paragraphs = selected.map((capsule, index) => {
    const location = capsule.location ? `在${capsule.location}` : `第 ${index + 1} 个瞬间`;
    const keywords = (capsule.keywords ?? []).slice(0, 3).join("、");
    const detail = capsuleText(capsule);
    const keywordSentence = keywords ? `关键词是${keywords}。` : "";

    return `${location}，${capsule.title}成为这段记忆的坐标。${detail}${keywordSentence}`;
  });

  return [
    `${styleLead[style] ?? styleLead.cinematic}，${destination}不是一个抽象目的地，而是由一枚枚记忆胶囊连起来的现场。`,
    ...paragraphs,
    "这些片段被 FlowMemo 串成今日画卷后，不再只是照片和碎碎念，而是一条可以被回看、被分享、也能继续生长的旅行故事线。",
  ].join("\n\n");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { journeyId, style = "cinematic", demoMode = false } = body;
  const travelDateKey = toDateKey(body.travelDate);

  if (!journeyId) {
    return NextResponse.json({ error: "缺少旅程 ID" }, { status: 400 });
  }

  let journey: { destination: string } | null = null;
  let capsules: CanvasCapsule[] = [];

  if (demoMode) {
    journey = { destination: body.destination ?? "日本 伊豆半岛" };
    capsules = Array.isArray(body.capsules) ? body.capsules : [];
  } else {
    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;
    const { id: userId } = auth.user;

    const [dbJourney, dbCapsules] = await Promise.all([
      getJourneyById(journeyId, userId),
      getCapsulesByJourney(journeyId, userId, {
        ...(travelDateKey ? { travelDate: dateKeyToDate(travelDateKey) } : {}),
      }),
    ]);
    journey = dbJourney;
    capsules = dbCapsules;
  }

  if (!journey) {
    return NextResponse.json({ error: "旅程不存在" }, { status: 404 });
  }

  if (capsules.length === 0) {
    return NextResponse.json({ error: "暂无记忆胶囊" }, { status: 400 });
  }

  const capsulesText = capsules
    .map((c, i) => {
      const keywords = (c.keywords ?? []).join("、");
      return `[胶囊${i + 1}] 标题：${c.title}，地点：${c.location ?? "未知"}，关键词：${keywords}，内容：${
        c.aiContent ?? c.userRawText ?? ""
      }`;
    })
    .join("\n");

  const styleMap: Record<string, string> = {
    cinematic: "电影旁白风格，沉浸、有画面感",
    healing: "治愈系风格，温柔自然",
    xiaohongshu: "小红书风格，轻快亲切",
    poetic: "诗意散文风格，意境悠远",
    funny: "轻松吐槽风格，幽默自嘲",
  };

  const messages = [
    {
      role: "system" as const,
      content: `你是 FlowMemo 的 AI 旅行记忆导演。根据用户今天的旅行记忆胶囊，生成一篇完整的“今日画卷”手账正文。
要求：
- 风格：${styleMap[style] ?? styleMap.cinematic}
- 以整体旅程为线索，把各个胶囊串联成有故事线的旅行叙述
- 总字数 300-500 字
- 直接输出手账正文，不要有标题或额外说明`,
    },
    {
      role: "user" as const,
      content: `今日旅程：${journey.destination}\n\n记忆胶囊内容：\n${capsulesText}`,
    },
  ];

  const options = {
    maxTokens: 900,
    temperature: 0.86,
  };

  if (demoMode) {
    let journal = "";
    try {
      journal = await generateAIText(messages, options);
    } catch {
      journal = "";
    }

    if (!isRelevantJournal(journal, journey.destination, capsules)) {
      journal = fallbackJournal(journey.destination, capsules, style);
    }

    return new Response(journal, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const readable = await streamAIText(messages, {
    maxTokens: 900,
    temperature: 0.86,
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
