import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { streamAIText } from "@/lib/ai/text-provider";

function demoAnswer(message: string) {
  if (message.includes("穿") || message.includes("衣服") || message.includes("天气")) {
    return `修善寺 11 月初白天通常比较舒适，可以按 16-20°C 准备。
- 白天：薄外套、衬衫或长袖 T 恤即可
- 早晚：温差明显，带一件针织开衫或轻薄抓绒
- 鞋子：温泉街和竹林多石板路，优先低跟舒适鞋
- 拍照：米白、雾蓝、橄榄绿会和竹林、温泉街很搭`;
  }

  if (message.includes("筑地") || message.includes("早餐") || message.includes("寿司")) {
    return `筑地附近可以按“先吃核心，再轻松散步”的路线走：

1. 先到筑地市场吃金枪鱼大腹或玉子烧
2. 再补一杯咖啡，避开主街最拥挤的摊位
3. 如果还想逛，往银座方向慢慢走，路上适合拍街景

建议把最想吃的那一家放在第一站，后面会轻松很多。`;
  }

  if (message.includes("手账") || message.includes("整理") || message.includes("日志")) {
    return `可以。现在最适合补两类素材：

- 一句现场感受：比如风、气味、声音、身体感受
- 一张环境照片：路牌、桌面、背影、窗外光线都可以

你按住底部语音说一段，我会把它写入时间线，并从照片池里自动挑适合的图做手账拼贴。`;
  }

  if (message.includes("修善寺") || message.includes("路线")) {
    return `修善寺这段建议不要排太满。温泉街、竹林小径和河边散步放在同一个半天最舒服。

上午先走竹林小径，人少光线也柔；中午回温泉街吃饭；傍晚留给旅馆和温泉。这样照片、声音和感受会自然连成一条时间线。`;
  }

  return "";
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    message,
    destination = "旅途中",
    startDate,
    endDate,
    notes = [],
    demoMode = false,
  } = body;

  if (!message?.trim()) {
    return new Response("缺少问题", { status: 400 });
  }

  if (!demoMode) {
    const auth = requireAuth(request);
    if (!auth.ok) return auth.response;
  }

  if (demoMode) {
    const answer = demoAnswer(message.trim());
    if (answer) {
      return new Response(answer, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  }

  const noteSummary = Array.isArray(notes)
    ? notes
        .slice(-6)
        .map((note: { title?: string; location?: string; userRawText?: string; aiContent?: string }, index: number) => {
          const content = note.userRawText || note.aiContent || note.title || "";
          return `${index + 1}. ${note.location ? `${note.location}：` : ""}${content}`;
        })
        .join("\n")
    : "";

  const readable = await streamAIText(
    [
      {
        role: "system",
        content: `你是 FlowMemo 的旅行助手，负责在聊天页帮助用户做轻量旅行计划、穿搭、路线、餐厅和记录整理。
回答要求：
- 直接、温暖、实用，优先给可执行建议。
- 如果用户明显是在记录旅行感受，不要改写成长文，只提示已适合写入时间线。
- 使用中文，避免营销口吻。
- 旅程目的地：${destination}
- 日期：${startDate ?? "未知"} 至 ${endDate ?? "未知"}
- 已有笔记：${noteSummary || "暂无"}`,
      },
      { role: "user", content: message.trim() },
    ],
    { maxTokens: 520, temperature: 0.72 }
  );

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
