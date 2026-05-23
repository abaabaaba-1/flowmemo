"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronDown, Clapperboard, Lightbulb, Package, Sparkles } from "lucide-react";
import type { Capsule } from "@/lib/journey-types";
import { useRouter } from "next/navigation";
import { request } from "@/lib/api/request";

interface AIBackpackProps {
  journeyId: string;
  capsules: Capsule[];
  destination?: string;
  isOpen: boolean;
  onToggle: () => void;
}

interface DirectorNotes {
  storyArc: string;
  socialHook: string;
  missingShot: string;
  nextPrompt: string;
  score: number;
}

function fallbackNotes(capsules: Capsule[]): DirectorNotes {
  const latest = capsules.at(-1);
  const keywords = [...new Set(capsules.flatMap((c) => c.keywords ?? []))].slice(0, 4);

  return {
    storyArc:
      capsules.length >= 3
        ? "今天已经有开场、细节和收束，可以直接生成完整画卷。"
        : "素材正在成形，还需要一个更有画面感的瞬间。",
    socialHook:
      latest?.aiContent?.slice(0, 42) ||
      latest?.title ||
      "把旅途碎片交给 AI，生成一张能分享的今日画卷。",
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

export function AIBackpack({ journeyId, capsules, destination, isOpen, onToggle }: AIBackpackProps) {
  const router = useRouter();
  const count = capsules.length;
  const [directorNotes, setDirectorNotes] = useState<DirectorNotes | null>(null);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  useEffect(() => {
    if (!isOpen || capsules.length === 0) return;

    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) setIsLoadingNotes(true);
        return request("/api/ai/director-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            journeyId,
            destination,
            capsules: capsules.map((capsule) => ({
              title: capsule.title,
              location: capsule.location,
              userRawText: capsule.userRawText,
              aiContent: capsule.aiContent,
              keywords: capsule.keywords,
              photoCount: capsule.photoCount,
            })),
          }),
        });
      })
      .then(async (res) => {
        if (!res.ok) throw new Error("director notes failed");
        return (await res.json()) as DirectorNotes;
      })
      .then((notes) => {
        if (!cancelled) setDirectorNotes(notes);
      })
      .catch(() => {
        if (!cancelled) setDirectorNotes(fallbackNotes(capsules));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingNotes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, capsules, destination, journeyId]);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Backpack panel */}
      <motion.div
        initial={false}
        animate={{ y: isOpen ? 0 : "calc(100% - 72px)" }}
        transition={{ type: "spring", stiffness: 300, damping: 35 }}
        className="absolute bottom-0 left-0 right-0 z-40 bg-[#0C0C0E] border-t border-[#1E1E24] rounded-t-2xl"
        style={{ maxHeight: "70vh" }}
      >
        {/* Handle & header */}
        <button
          onClick={onToggle}
          className="w-full pt-3 pb-4 flex flex-col items-center gap-2"
        >
          <div className="w-8 h-1 rounded-full bg-[#1E1E24]" />
          <div className="flex items-center justify-between w-full px-5">
            <div className="flex items-center gap-3">
              {/* Animated backpack icon */}
              <motion.div
                animate={count > 0 ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.4 }}
                className="relative w-10 h-10 rounded-xl bg-[#E99A3F]/10 border border-[#E99A3F]/30 flex items-center justify-center"
              >
                <Package size={18} className="text-[#E99A3F]" />
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#E99A3F] text-[#0C0C0E] text-[10px] font-bold flex items-center justify-center"
                  >
                    {count}
                  </motion.span>
                )}
              </motion.div>

              <div className="text-left">
                <p className="text-xs font-semibold text-[#F5F5F7]">AI 行囊</p>
                <p className="text-[10px] text-[#9E9EAF]">
                  {count === 0 ? "还没有记忆胶囊" : `今日 ${count} 枚记忆胶囊`}
                </p>
              </div>
            </div>

            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.25 }}
            >
              <ChevronDown size={16} className="text-[#494954]" />
            </motion.div>
          </div>
        </button>

        {/* Capsule list (when open) */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-y-auto px-5 pb-4"
              style={{ maxHeight: "calc(70vh - 90px)" }}
            >
              {count === 0 ? (
                <div className="text-center py-8 text-[#494954] text-xs">
                  随手说一句或上传照片，记忆胶囊就会出现在这里
                </div>
              ) : (
                <div className="space-y-3">
                  <section className="rounded-xl border border-[#E99A3F]/25 bg-[#E99A3F]/[0.06] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E99A3F]/30 bg-[#E99A3F]/10">
                          <Clapperboard size={15} className="text-[#E99A3F]" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#F5F5F7]">AI 导演台</p>
                          <p className="text-[10px] text-[#494954]">
                            {isLoadingNotes ? "正在判断今日故事线..." : "实时判断素材是否够出片"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-lg font-semibold text-[#E99A3F]">
                          {Math.round(directorNotes?.score ?? fallbackNotes(capsules).score)}
                        </p>
                        <p className="text-[9px] text-[#494954]">READY</p>
                      </div>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-black/60">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${directorNotes?.score ?? fallbackNotes(capsules).score}%` }}
                        className="h-full rounded-full bg-[#E99A3F]"
                      />
                    </div>

                    <div className="mt-4 space-y-3 text-[11px] leading-relaxed">
                      <div className="flex gap-2">
                        <Sparkles size={13} className="mt-0.5 shrink-0 text-[#E99A3F]" />
                        <p className="text-[#D8D8DE]">
                          {directorNotes?.storyArc ?? fallbackNotes(capsules).storyArc}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Lightbulb size={13} className="mt-0.5 shrink-0 text-[#E99A3F]" />
                        <p className="text-[#9E9EAF]">
                          {directorNotes?.missingShot ?? fallbackNotes(capsules).missingShot}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[#1E1E24] bg-black/35 p-3">
                        <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[#E99A3F]">
                          Next prompt
                        </p>
                        <p className="text-[#F5F5F7]">
                          {directorNotes?.nextPrompt ?? fallbackNotes(capsules).nextPrompt}
                        </p>
                      </div>
                    </div>
                  </section>

                  {directorNotes?.socialHook && (
                    <div className="rounded-xl border border-[#1E1E24] bg-black/35 p-3">
                      <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[#494954]">
                        Social hook
                      </p>
                      <p className="text-xs leading-relaxed text-[#F5F5F7]">
                        {directorNotes.socialHook}
                      </p>
                    </div>
                  )}

                  {capsules.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-3 p-3 bg-[#121216] border border-[#1E1E24] rounded-xl hover:border-[#E99A3F]/30 transition-colors"
                    >
                      {/* Capsule number */}
                      <div className="w-6 h-6 rounded-lg bg-[#E99A3F]/10 border border-[#E99A3F]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-[#E99A3F]">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#F5F5F7] truncate">{c.title}</p>
                        <p className="text-[10px] text-[#494954] mt-0.5">
                          {c.location ? `${c.location} · ` : ""}
                          {(c.keywords ?? []).slice(0, 3).join("、")}
                        </p>
                        {c.photoCount > 0 && (
                          <p className="text-[10px] text-[#9E9EAF] mt-0.5">已匹配 {c.photoCount} 张照片</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {count > 0 && (
                <div className="mt-4 pt-4 border-t border-[#1E1E24] flex gap-3">
                  <button
                    onClick={onToggle}
                    className="flex-1 py-3 border border-[#1E1E24] rounded-xl text-xs text-[#9E9EAF] hover:bg-white/5 transition-colors"
                  >
                    返回行程
                  </button>
                  <button
                    onClick={() => router.push(`/daily-canvas/${journeyId}`)}
                    className="flex-1 py-3 bg-[#E99A3F] text-[#0C0C0E] font-semibold rounded-xl text-xs flex items-center justify-center gap-2 hover:brightness-110 transition-all"
                  >
                    <span>开启今日画卷</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
