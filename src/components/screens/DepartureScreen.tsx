"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  FileImage,
  ImagePlus,
  Loader2,
  MapPin,
  Mountain,
} from "lucide-react";
import { toast } from "sonner";
import { request } from "@/lib/api/request";
import { clearStoredDemoJourney, storeDemoJourneyDraft } from "@/lib/demo-session";

const IS_LOCAL_RUNTIME = process.env.NEXT_PUBLIC_FLOWMEMO_RUNTIME === "local";

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      resolve(value.split(",")[1] ?? value);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dateLabel(value: string) {
  if (!value) return "选择日期";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

export function DepartureScreen() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [startDate, setStartDate] = useState("2026-11-08");
  const [endDate, setEndDate] = useState("2026-11-14");
  const [destination, setDestination] = useState("伊豆 · 修善寺 · 东京");
  const [importedName, setImportedName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [showTransition, setShowTransition] = useState(false);

  function validate() {
    if (!startDate || !endDate || !destination.trim()) {
      toast.error("请先补齐出行日期和目的地");
      return false;
    }
    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      toast.error("返程日期不能早于出发日期");
      return false;
    }
    return true;
  }

  async function handleImport(file: File) {
    setIsImporting(true);
    setImportedName(file.name);

    try {
      const imageBase64 = await fileToBase64(file);
      const res = await fetch("/api/ai/import-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mimeType: file.type,
          fileName: file.name,
          demoMode: IS_LOCAL_RUNTIME,
        }),
      });

      if (!res.ok) throw new Error("import failed");
      const data = (await res.json()) as {
        destination?: string;
        startDate?: string;
        endDate?: string;
        title?: string;
      };

      if (data.startDate) setStartDate(data.startDate);
      if (data.endDate) setEndDate(data.endDate);
      if (data.destination) setDestination(data.destination);
      toast.success("行程已识别并回填");
    } catch {
      toast.info("未能完整识别，已保留文件并使用演示行程回填");
      setStartDate("2026-11-08");
      setEndDate("2026-11-14");
      setDestination("日本 · 伊豆 · 东京");
    } finally {
      setIsImporting(false);
    }
  }

  async function createJourneyRoute() {
    clearStoredDemoJourney();
    storeDemoJourneyDraft({
      destination: destination.trim(),
      startDate,
      endDate,
      importedFrom: importedName || undefined,
    });

    if (IS_LOCAL_RUNTIME) return "/journey/demo-journey-izu";

    try {
      const res = await request("/api/journeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destination.trim(),
          startDate,
          endDate,
          description: importedName ? `由 ${importedName} 导入` : "FlowMemo 启程准备",
        }),
      });
      if (res.ok) {
        const journey = (await res.json()) as { id?: string };
        if (journey.id) return `/journey/${journey.id}`;
      }
    } catch {
      // Fall back to demo journey.
    }

    return "/journey/demo-journey-izu";
  }

  async function launch() {
    if (!validate()) return;
    setIsLaunching(true);
    const route = await createJourneyRoute();
    setShowTransition(true);
    setTimeout(() => {
      router.push(route);
    }, 1500);
  }

  return (
    <main className="min-h-svh bg-[#F7F1E8] px-5 py-8 text-[#1E1712]">
      <AnimatePresence mode="wait">
        {showTransition ? (
          <motion.section
            key="transition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[80svh] flex-col items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7 }}
              className="relative flex h-56 w-56 items-center justify-center rounded-full border border-[#D9CCB8] bg-[#FFF9EF]"
            >
              <Mountain size={96} strokeWidth={1.2} className="text-[#87A8A2]" />
              <div className="absolute bottom-12 h-px w-28 bg-[#C86B4A]/35" />
              <div className="absolute bottom-9 h-px w-20 bg-[#87A8A2]/50" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 text-sm font-semibold tracking-[0.22em] text-[#8B8174]"
            >
              正在织入旅程线索
            </motion.p>
          </motion.section>
        ) : (
          <motion.section
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-auto flex min-h-[calc(100svh-64px)] max-w-[430px] flex-col"
          >
            <header className="pt-4">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#C86B4A]">FlowMemo</p>
              <h1 className="mt-4 text-[34px] font-black leading-tight tracking-normal">
                启程前，把旅程线索先交给我
              </h1>
              <p className="mt-4 text-base leading-7 text-[#7B6F61]">
                填日期和目的地，或导入机票、行程截图。之后你只需要聊天、说话、拍照，手账会在后台慢慢成形。
              </p>
            </header>

            <div className="mt-8 space-y-4">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[22px] border border-[#D9CCB8] bg-[#EFE7D8] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                <label className="relative min-w-0">
                  <span className="mb-2 flex items-center gap-1.5 text-xs font-black text-[#8B8174]">
                    <CalendarDays size={13} />
                    去程
                  </span>
                  <span className="block text-lg font-black">{dateLabel(startDate)}</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="去程日期"
                  />
                </label>
                <span className="h-px w-6 bg-[#C9BBA5]" />
                <label className="relative min-w-0">
                  <span className="mb-2 flex items-center gap-1.5 text-xs font-black text-[#8B8174]">
                    <CalendarDays size={13} />
                    返程
                  </span>
                  <span className="block text-lg font-black">{dateLabel(endDate)}</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="返程日期"
                  />
                </label>
              </div>

              <label className="block rounded-[22px] border border-[#D9CCB8] bg-[#FFF9EF] px-5 py-4">
                <span className="mb-2 flex items-center gap-1.5 text-xs font-black text-[#8B8174]">
                  <MapPin size={13} />
                  目的地
                </span>
                <input
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="例如：日本、伊豆、东京"
                  className="w-full bg-transparent text-lg font-black outline-none placeholder:text-[#B2A693]"
                />
              </label>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-between rounded-[22px] border border-dashed border-[#C9BBA5] bg-[#FFF9EF] px-5 py-4 text-left"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EFE7D8] text-[#C86B4A]">
                    {isImporting ? <Loader2 size={18} className="animate-spin" /> : <FileImage size={18} />}
                  </span>
                  <span>
                    <span className="block text-sm font-black">上传行程图片 / 表单截图</span>
                    <span className="mt-1 block text-xs text-[#8B8174]">
                      {importedName || "支持机票、酒店订单、行程表截图"}
                    </span>
                  </span>
                </span>
                <ImagePlus size={18} className="text-[#C86B4A]" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void handleImport(file);
                }}
              />
            </div>

            <div className="mt-auto pb-3 pt-8">
              <button
                onClick={launch}
                disabled={isLaunching || isImporting}
                className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-[#1E1712] px-6 py-5 text-base font-black text-white shadow-[0_16px_40px_rgba(30,23,18,0.18)] disabled:opacity-60"
              >
                {isLaunching ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                开启织流
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
