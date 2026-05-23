"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft, Download, Loader2, Share2 } from "lucide-react";
import { memory, share } from "@eazo/sdk";
import { toast } from "sonner";
import { generateDailyCanvas, getJourneyById, getJourneyCapsules } from "@/lib/api";
import type { Capsule, Journey, StyleKey } from "@/lib/journey-types";
import { STYLE_LABELS } from "@/lib/journey-types";
import { DEMO_CAPSULES, DEMO_JOURNEY, DEMO_JOURNAL_TEXT } from "@/lib/demo-data";
import { getStoredDemoCapsules } from "@/lib/demo-session";
import { JournalMode } from "./DailyCanvasJournal";
import { VlogMode } from "./DailyCanvasVlog";
import { ExportCanvas } from "./ExportCanvas";
import { SocialShareKit } from "./SocialShareKit";

const EAZO_CLIENT_ENABLED = process.env.NEXT_PUBLIC_FLOWMEMO_RUNTIME !== "local";

interface DailyCanvasScreenProps {
  journeyId: string;
}

type DisplayMode = "journal" | "vlog";

function hasLiveCapsules(capsules: Capsule[]) {
  return capsules.some((capsule) => String(capsule.id).startsWith("demo-live-"));
}

export function DailyCanvasScreen({ journeyId }: DailyCanvasScreenProps) {
  const router = useRouter();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [activeStyle, setActiveStyle] = useState<StyleKey>("cinematic");
  const [mode, setMode] = useState<DisplayMode>("journal");
  const [journalText, setJournalText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const isDemoMode = journeyId === "demo-journey-izu";

  useEffect(() => {
    async function load() {
      if (isDemoMode) {
        const storedCapsules = getStoredDemoCapsules();
        const displayCapsules =
          storedCapsules.length > 0 ? storedCapsules : (DEMO_CAPSULES as unknown as Capsule[]);
        setJourney(DEMO_JOURNEY as unknown as Journey);
        setCapsules(displayCapsules);
        setJournalText(storedCapsules.length > 0 ? "" : DEMO_JOURNAL_TEXT.cinematic);
        setIsLoading(false);
        return;
      }

      try {
        const [loadedJourney, loadedCapsules] = await Promise.all([
          getJourneyById(journeyId),
          getJourneyCapsules(journeyId),
        ]);
        setJourney(loadedJourney);
        setCapsules(loadedCapsules);
      } catch {
        toast.error("加载今日画卷失败");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [journeyId, isDemoMode]);

  async function generateJournal(style: StyleKey) {
    if (capsules.length === 0) return;

    if (isDemoMode && !hasLiveCapsules(capsules)) {
      setIsGenerating(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setJournalText(DEMO_JOURNAL_TEXT[style] ?? DEMO_JOURNAL_TEXT.cinematic);
      setIsGenerating(false);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsGenerating(true);
    setJournalText("");

    try {
      await generateDailyCanvas({
        journeyId,
        style,
        demoMode: isDemoMode,
        destination: journey?.destination ?? "日本 伊豆",
        capsules,
        signal: abortRef.current.signal,
        onChunk: setJournalText,
      });

      if (EAZO_CLIENT_ENABLED) {
        memory
          .reportAction({
            content: `用户生成今日画卷：${journey?.destination ?? "旅途"} · ${STYLE_LABELS[style].label}`,
            event_type: "create",
            page: "daily-canvas",
            metadata: {
              type: "generate_canvas",
              journey_id: journeyId,
              style,
              capsule_count: capsules.length,
            },
          })
          .catch(() => {});
      }
    } catch (error: unknown) {
      if ((error as Error)?.name !== "AbortError") {
        toast.error("生成手账失败，已使用本地文案兜底");
        setJournalText(DEMO_JOURNAL_TEXT[style] ?? DEMO_JOURNAL_TEXT.cinematic);
      }
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    if (!isLoading && capsules.length > 0 && !journalText) {
      const timer = window.setTimeout(() => {
        void generateJournal(activeStyle);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
    // generateJournal intentionally reads the latest loaded journey/capsules.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, capsules.length, journalText, activeStyle]);

  async function handleStyleChange(style: StyleKey) {
    setActiveStyle(style);
    await generateJournal(style);
  }

  async function handleExport() {
    setIsExporting(true);
    setShowExportModal(true);
    await new Promise((resolve) => setTimeout(resolve, 400));

    try {
      const html2canvas = (await import("html2canvas")).default;
      const node = exportRef.current;
      if (!node) throw new Error("render target missing");

      const canvas = await html2canvas(node, {
        backgroundColor: "#F7F1E8",
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 8000,
      });

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `FlowMemo_${(journey?.destination ?? "旅途").replace(/\s/g, "_")}_${new Date()
        .toISOString()
        .slice(0, 10)}.jpg`;
      link.click();

      toast.success("今日画卷已保存到本地");

      if (EAZO_CLIENT_ENABLED) {
        memory
          .reportAction({
            content: `用户导出今日画卷图片：${journey?.destination ?? "旅途"}`,
            event_type: "create",
            page: "daily-canvas",
            metadata: { type: "export_canvas", journey_id: journeyId, style: activeStyle },
          })
          .catch(() => {});
      }
    } catch {
      toast.error("导出失败，请重试");
    } finally {
      setIsExporting(false);
      setTimeout(() => setShowExportModal(false), 500);
    }
  }

  async function handleShare() {
    const shareText = [
      "【FlowMemo 今日画卷】",
      `Journey: ${journey?.destination ?? "旅途"}`,
      `Date: ${new Date().toLocaleDateString("zh-CN")}`,
      `Capsules: ${capsules.length} 枚记忆胶囊`,
      `Style: ${STYLE_LABELS[activeStyle].label}`,
      `Snippet: ${journalText.slice(0, 150)}`,
    ].join("\n");

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ text: shareText, title: "FlowMemo 今日画卷" });
        return;
      } catch {
        // Fall through to Eazo share or clipboard.
      }
    }

    if (EAZO_CLIENT_ENABLED) {
      try {
        await share.compose({
          text: shareText,
          attachments: capsules[0]?.photoUrls?.[0]
            ? [{ type: "image", url: capsules[0].photoUrls[0], caption: "旅途封面照片" }]
            : undefined,
          sourceAppId: process.env.NEXT_PUBLIC_EAZO_APP_ID ?? undefined,
          targetPath: `/daily-canvas/${journeyId}`,
        });
        return;
      } catch {
        // Fall through to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("已复制分享文案");
    } catch {
      toast.error("分享失败，请重试");
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#F7F1E8]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D9CCB8] border-t-[#C86B4A]" />
          <p className="font-mono text-xs tracking-widest text-[#8B8174]">UNROLLING CANVAS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-svh flex-col bg-[#F7F1E8] text-[#1E1712]">
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-80 bg-[radial-gradient(ellipse_at_50%_0%,rgba(200,107,74,0.10),transparent_70%)]" />

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#DED1BD] bg-[#F7F1E8]/95 px-5 pb-3 pt-10 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/journey/${journeyId}`)}
            className="rounded-full border border-[#D9CCB8] bg-[#FFF9EF] p-1.5 transition-colors"
            aria-label="返回旅程"
          >
            <ChevronLeft size={16} className="text-[#C86B4A]" />
          </button>
          <div>
            <h3 className="text-xs font-semibold tracking-wider text-[#1E1712]">
              今日画卷 · {journey?.destination ?? "旅途"}
              {isDemoMode && (
                <span className="ml-2 rounded border border-[#E2C5B7] bg-[#FFF4EA] px-1.5 py-0.5 font-mono text-[9px] text-[#C86B4A]">
                  DEMO
                </span>
              )}
            </h3>
            <p className="font-mono text-[8px] uppercase text-[#8B8174]">
              {capsules.length} 枚胶囊
            </p>
          </div>
        </div>

        <div className="flex rounded-lg border border-[#D9CCB8] bg-[#EFE7D8] p-0.5">
          <button
            onClick={() => setMode("journal")}
            className={`rounded-md px-3 py-1 text-[10px] font-semibold tracking-wider transition-all ${
              mode === "journal" ? "bg-[#FFF9EF] text-[#C86B4A]" : "text-[#8B8174]"
            }`}
          >
            手账
          </button>
          <button
            onClick={() => setMode("vlog")}
            className={`rounded-md px-3 py-1 text-[10px] font-semibold tracking-wider transition-all ${
              mode === "vlog" ? "bg-[#FFF9EF] text-[#C86B4A]" : "text-[#8B8174]"
            }`}
          >
            Vlog
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6 pb-[200px]">
        <AnimatePresence mode="wait">
          {mode === "journal" ? (
            <motion.div
              key="journal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <JournalMode
                capsules={capsules}
                journalText={journalText}
                activeStyle={activeStyle}
                isGenerating={isGenerating}
              />
            </motion.div>
          ) : (
            <motion.div
              key="vlog"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <VlogMode capsules={capsules} journeyDestination={journey?.destination ?? "旅途"} />
            </motion.div>
          )}
        </AnimatePresence>

        <SocialShareKit
          journey={journey}
          capsules={capsules}
          journalText={journalText}
          activeStyle={activeStyle}
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 space-y-3 border-t border-[#DED1BD] bg-[#F7F1E8]/95 px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-4 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {(Object.entries(STYLE_LABELS) as [StyleKey, { label: string; desc: string }][]).map(
            ([key, { label }]) => (
              <motion.button
                key={key}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleStyleChange(key)}
                disabled={isGenerating}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium tracking-wide transition-all disabled:opacity-40 ${
                  activeStyle === key
                    ? "border-[#C86B4A] bg-[#FFF4EA] text-[#C86B4A]"
                    : "border-[#D9CCB8] bg-[#FFF9EF] text-[#8B8174]"
                }`}
              >
                {isGenerating && activeStyle === key ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={10} className="animate-spin" />
                    {label}
                  </span>
                ) : (
                  label
                )}
              </motion.button>
            )
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#D9CCB8] bg-[#FFF9EF] py-3 text-xs font-medium text-[#8B8174] transition-colors"
          >
            <Share2 size={14} />
            <span>分享手账</span>
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleExport}
            disabled={isExporting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E1712] py-3 text-xs font-semibold uppercase tracking-wider text-white transition-colors disabled:opacity-60"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>{isExporting ? "渲染中..." : "导出画卷"}</span>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E1E24] border-t-[#E99A3F]" />
              <p className="font-mono text-xs tracking-widest text-[#9E9EAF]">RENDERING CANVAS...</p>

              <div className="pointer-events-none absolute opacity-0" style={{ left: "-9999px", top: 0 }}>
                <ExportCanvas
                  ref={exportRef}
                  journey={journey}
                  capsules={capsules}
                  journalText={journalText}
                  activeStyle={activeStyle}
                  authorName="旅人"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
