"use client";

import { Clipboard, Film, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Capsule, Journey, StyleKey } from "@/lib/journey-types";
import { STYLE_LABELS } from "@/lib/journey-types";
import { dateKeyToDate } from "@/lib/journey-date";

interface SocialShareKitProps {
  journey: Journey | null;
  capsules: Capsule[];
  journalText: string;
  activeStyle: StyleKey;
  travelDate?: string;
}

function pickLeadText(capsules: Capsule[], journalText: string) {
  const fromJournal = journalText
    .split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean);
  if (fromJournal) return fromJournal.slice(0, 90);

  const fromCapsule = capsules.find((c) => c.aiContent || c.userRawText);
  return (fromCapsule?.aiContent ?? fromCapsule?.userRawText ?? "今天的旅途被织成了一组会发光的记忆胶囊。").slice(0, 90);
}

function buildTags(capsules: Capsule[]) {
  const tags = [...new Set(capsules.flatMap((c) => c.keywords ?? []))]
    .filter(Boolean)
    .slice(0, 6);
  return tags.length > 0 ? tags : ["旅行手账", "AI旅行", "FlowMemo"];
}

function buildSceneLines(capsules: Capsule[]) {
  const source = capsules.length > 0 ? capsules : [];
  if (source.length === 0) {
    return ["镜头 01：目的地慢慢出现，字幕浮现今天的第一句心情。"];
  }

  return source.slice(0, 4).map((capsule, index) => {
    const scene = String(index + 1).padStart(2, "0");
    const place = capsule.location || "旅途中";
    const line = capsule.aiContent || capsule.userRawText || capsule.title;
    return `镜头 ${scene}：${place}，${line.slice(0, 46)}`;
  });
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("已复制到剪贴板");
  } catch {
    toast.error("复制失败，请手动选择文本");
  }
}

export function SocialShareKit({
  journey,
  capsules,
  journalText,
  activeStyle,
  travelDate,
}: SocialShareKitProps) {
  const destination = journey?.destination ?? "我的旅途";
  const tags = buildTags(capsules);
  const lead = pickLeadText(capsules, journalText);
  const styleLabel = STYLE_LABELS[activeStyle]?.label ?? "电影旁白";
  const photoCount = capsules.reduce(
    (sum, capsule) => sum + (capsule.photoCount || capsule.photoUrls?.length || 0),
    0
  );
  const date = (travelDate ? dateKeyToDate(travelDate) : new Date()).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });

  const xiaohongshu = [
    `标题：我把${destination}的一天交给 AI 剪成了电影`,
    "",
    lead,
    "",
    `今天收集了 ${capsules.length} 枚记忆胶囊${photoCount ? `、${photoCount} 张照片` : ""}。`,
    `FlowMemo 用 ${styleLabel} 风格把碎片织成了一张今日画卷。`,
    "",
    tags.map((tag) => `#${tag}`).join(" "),
  ].join("\n");

  const moments = [
    `${date}｜${destination}`,
    lead,
    "",
    `今天不是拍了很多照片，是把 ${capsules.length} 个瞬间留了下来。`,
    "由 FlowMemo AI 织成今日画卷。",
  ].join("\n");

  const vlogScript = [
    `15 秒 Vlog 分镜｜${destination}`,
    "0-2s：目的地环境声开场，保留第一帧真实照片。",
    ...buildSceneLines(capsules).map((line, index) => `${index * 3 + 2}-${index * 3 + 5}s：${line}`),
    "结尾：定格今日画卷，字幕落在最有情绪的一句话。",
  ].join("\n");

  const shareBlocks = [
    {
      key: "xhs",
      title: "小红书",
      desc: "封面标题 + 正文 + 标签",
      icon: Sparkles,
      content: xiaohongshu,
    },
    {
      key: "moments",
      title: "朋友圈",
      desc: "克制口吻，适合配长图",
      icon: MessageCircle,
      content: moments,
    },
    {
      key: "vlog",
      title: "短视频",
      desc: "15 秒分镜脚本",
      icon: Film,
      content: vlogScript,
    },
  ];

  return (
    <section className="mt-8 space-y-3">
      <div className="flex items-center justify-between border-b border-[#1E1E24] pb-3">
        <div>
          <p className="text-[10px] font-mono tracking-[0.22em] text-[#E99A3F] uppercase">
            SOCIAL CUTS
          </p>
          <h4 className="mt-1 text-sm font-semibold text-[#F5F5F7]">
            社交传播包
          </h4>
        </div>
        <span className="rounded-full border border-[#E99A3F]/20 bg-[#E99A3F]/10 px-2.5 py-1 text-[10px] text-[#E99A3F]">
          {capsules.length} 枚胶囊
        </span>
      </div>

      <div className="grid gap-3">
        {shareBlocks.map(({ key, title, desc, icon: Icon, content }) => (
          <article
            key={key}
            className="rounded-xl border border-[#1E1E24] bg-[#121216] p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E99A3F]/20 bg-[#E99A3F]/10">
                  <Icon size={15} className="text-[#E99A3F]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#F5F5F7]">{title}</p>
                  <p className="text-[10px] text-[#494954]">{desc}</p>
                </div>
              </div>
              <button
                onClick={() => copyText(content)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#1E1E24] bg-black/40 px-2.5 py-1.5 text-[10px] text-[#9E9EAF] transition-colors hover:border-[#E99A3F]/40 hover:text-[#F5F5F7]"
              >
                <Clipboard size={11} />
                <span>复制</span>
              </button>
            </div>
            <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg border border-[#1E1E24] bg-black/35 p-3 text-[11px] leading-relaxed text-[#9E9EAF]">
              {content}
            </pre>
          </article>
        ))}
      </div>
    </section>
  );
}
