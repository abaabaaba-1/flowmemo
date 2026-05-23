"use client";

import { useEffect, useRef, useState } from "react";
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
import { createJourney, getActiveJourney, importItineraryFromImage, standardizeDestination } from "@/lib/api";
import { clearStoredDemoJourney, storeDemoJourneyDraft } from "@/lib/demo-session";
import {
  standardizeDestinationLocal,
  type DestinationInput,
  type StandardizedDestination,
} from "@/lib/destination";
import type { Journey } from "@/lib/journey-types";
import { fileToBase64 } from "@/utils/image-upload";

const IS_LOCAL_RUNTIME = process.env.NEXT_PUBLIC_FLOWMEMO_RUNTIME === "local";

function dateLabel(value: string) {
  if (!value) return "选择日期";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function isBefore(left: string, right: string) {
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) return false;
  return leftDate.getTime() < rightDate.getTime();
}

type DateInputElement = HTMLInputElement & {
  showPicker?: () => void;
};

function openDatePicker(input: DateInputElement | null) {
  if (!input) return;
  input.focus({ preventScroll: true });

  try {
    input.showPicker?.();
  } catch {
    // Some mobile WebViews reject showPicker even from a direct tap.
  }
}

export function DepartureScreen() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<DateInputElement>(null);
  const endDateRef = useRef<DateInputElement>(null);
  const [startDate, setStartDate] = useState("2026-11-08");
  const [endDate, setEndDate] = useState("2026-11-14");
  const [destinationCountryRegion, setDestinationCountryRegion] = useState("日本");
  const [destinationCity, setDestinationCity] = useState("伊豆");
  const [destinationPlace, setDestinationPlace] = useState("修善寺 · 东京");
  const [destinationNote, setDestinationNote] = useState("");
  const [importedName, setImportedName] = useState("");
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [isLoadingActiveJourney, setIsLoadingActiveJourney] = useState(!IS_LOCAL_RUNTIME);
  const [isImporting, setIsImporting] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isStandardizingDestination, setIsStandardizingDestination] = useState(false);
  const [showTransition, setShowTransition] = useState(false);

  useEffect(() => {
    if (IS_LOCAL_RUNTIME) return;

    let cancelled = false;
    getActiveJourney()
      .then((journey) => {
        if (!cancelled) setActiveJourney(journey);
      })
      .catch(() => {
        if (!cancelled) setActiveJourney(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingActiveJourney(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function applyStartDate(nextStartDate: string) {
    setStartDate(nextStartDate);
    setEndDate((currentEndDate) =>
      currentEndDate && isBefore(currentEndDate, nextStartDate) ? nextStartDate : currentEndDate
    );
  }

  function applyEndDate(nextEndDate: string) {
    setEndDate(isBefore(nextEndDate, startDate) ? startDate : nextEndDate);
  }

  function applyImportedDates(nextStartDate?: string, nextEndDate?: string) {
    if (!nextStartDate && !nextEndDate) return;

    const resolvedStartDate = nextStartDate ?? startDate;
    const resolvedEndDate = nextEndDate ?? endDate;
    setStartDate(resolvedStartDate);
    setEndDate(isBefore(resolvedEndDate, resolvedStartDate) ? resolvedStartDate : resolvedEndDate);
  }

  function currentDestinationInput(): DestinationInput {
    return {
      destinationCountryRegion,
      destinationCity,
      destinationPlace,
      destinationNote,
    };
  }

  function applyDestinationInput(input: DestinationInput) {
    const standardized = standardizeDestinationLocal(input);
    setDestinationCountryRegion(standardized.destinationCountryRegion);
    setDestinationCity(standardized.destinationCity);
    setDestinationPlace(standardized.destinationPlace);
    setDestinationNote(standardized.destinationNote);
  }

  async function resolveDestination(): Promise<StandardizedDestination> {
    const localDestination = standardizeDestinationLocal(currentDestinationInput());
    if (IS_LOCAL_RUNTIME) return localDestination;

    setIsStandardizingDestination(true);
    try {
      return await standardizeDestination({
        ...currentDestinationInput(),
        destination: localDestination.destination,
      });
    } catch {
      return localDestination;
    } finally {
      setIsStandardizingDestination(false);
    }
  }

  function validate() {
    const destination = standardizeDestinationLocal(currentDestinationInput());
    if (!startDate || !endDate || !destination.destination) {
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
      const data = await importItineraryFromImage({
        imageBase64,
        mimeType: file.type,
        fileName: file.name,
        demoMode: IS_LOCAL_RUNTIME,
      });

      applyImportedDates(data.startDate, data.endDate);
      applyDestinationInput(data);
      toast.success("行程已识别并回填");
    } catch {
      if (IS_LOCAL_RUNTIME) {
        toast.info("未能完整识别，已保留文件并使用演示行程回填");
        setStartDate("2026-11-08");
        setEndDate("2026-11-14");
        applyDestinationInput({
          destinationCountryRegion: "日本",
          destinationCity: "伊豆",
          destinationPlace: "修善寺 · 东京",
        });
      } else {
        toast.error("未能识别行程图片，已保留当前输入");
      }
    } finally {
      setIsImporting(false);
    }
  }

  async function createJourneyRoute() {
    const destination = await resolveDestination();
    applyDestinationInput(destination);
    clearStoredDemoJourney();
    storeDemoJourneyDraft({
      ...destination,
      startDate,
      endDate,
      importedFrom: importedName || undefined,
    });

    if (IS_LOCAL_RUNTIME) return "/journey/demo-journey-izu";

    try {
      const journey = await createJourney({
        ...destination,
        startDate,
        endDate,
        description: importedName ? `由 ${importedName} 导入` : "FlowMemo 启程准备",
      });
      if (journey.id) return `/journey/${journey.id}`;
    } catch (error) {
      throw error instanceof Error ? error : new Error("创建旅程失败");
    }

    throw new Error("创建旅程失败");
  }

  async function launch() {
    if (!validate()) return;
    setIsLaunching(true);
    try {
      const route = await createJourneyRoute();
      setShowTransition(true);
      setTimeout(() => {
        router.push(route);
      }, 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建旅程失败，请检查登录状态后重试");
      setIsLaunching(false);
    }
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
                填日期和地点信息，或导入机票、行程截图。之后你只需要聊天、说话、拍照，手账会在后台慢慢成形。
              </p>
            </header>

            <div className="mt-8 space-y-4">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[22px] border border-[#D9CCB8] bg-[#EFE7D8] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                <label
                  className="relative min-w-0"
                  onClick={() => openDatePicker(startDateRef.current)}
                >
                  <span className="mb-2 flex items-center gap-1.5 text-xs font-black text-[#8B8174]">
                    <CalendarDays size={13} />
                    去程
                  </span>
                  <span className="block text-lg font-black">{dateLabel(startDate)}</span>
                  <input
                    ref={startDateRef}
                    type="date"
                    value={startDate}
                    onInput={(event) => applyStartDate(event.currentTarget.value)}
                    onChange={(event) => applyStartDate(event.target.value)}
                    onBlur={(event) => applyStartDate(event.currentTarget.value)}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-[0.01]"
                    aria-label="去程日期"
                  />
                </label>
                <span className="h-px w-6 bg-[#C9BBA5]" />
                <label
                  className="relative min-w-0"
                  onClick={() => openDatePicker(endDateRef.current)}
                >
                  <span className="mb-2 flex items-center gap-1.5 text-xs font-black text-[#8B8174]">
                    <CalendarDays size={13} />
                    返程
                  </span>
                  <span className="block text-lg font-black">{dateLabel(endDate)}</span>
                  <input
                    ref={endDateRef}
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onInput={(event) => applyEndDate(event.currentTarget.value)}
                    onChange={(event) => applyEndDate(event.target.value)}
                    onBlur={(event) => applyEndDate(event.currentTarget.value)}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-[0.01]"
                    aria-label="返程日期"
                  />
                </label>
              </div>

              <div className="rounded-[22px] border border-[#D9CCB8] bg-[#FFF9EF] px-5 py-4">
                <span className="mb-3 flex items-center gap-1.5 text-xs font-black text-[#8B8174]">
                  <MapPin size={13} />
                  地点信息
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block min-w-0">
                    <span className="mb-1 block text-[11px] font-black text-[#8B8174]">国家/地区</span>
                    <input
                      value={destinationCountryRegion}
                      onChange={(event) => setDestinationCountryRegion(event.target.value)}
                      placeholder="日本"
                      className="w-full min-w-0 bg-transparent text-base font-black outline-none placeholder:text-[#B2A693]"
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-1 block text-[11px] font-black text-[#8B8174]">城市/区域</span>
                    <input
                      value={destinationCity}
                      onChange={(event) => setDestinationCity(event.target.value)}
                      placeholder="伊豆"
                      className="w-full min-w-0 bg-transparent text-base font-black outline-none placeholder:text-[#B2A693]"
                    />
                  </label>
                </div>
                <label className="mt-3 block min-w-0 border-t border-[#EFE7D8] pt-3">
                  <span className="mb-1 block text-[11px] font-black text-[#8B8174]">具体地点</span>
                  <input
                    value={destinationPlace}
                    onChange={(event) => setDestinationPlace(event.target.value)}
                    placeholder="修善寺 · 东京"
                    className="w-full min-w-0 bg-transparent text-base font-black outline-none placeholder:text-[#B2A693]"
                  />
                </label>
                <label className="mt-3 block min-w-0 border-t border-[#EFE7D8] pt-3">
                  <span className="mb-1 block text-[11px] font-black text-[#8B8174]">自由描述</span>
                  <textarea
                    value={destinationNote}
                    onChange={(event) => setDestinationNote(event.target.value)}
                    placeholder="酒店、路线或补充说明"
                    rows={2}
                    className="w-full min-w-0 resize-none bg-transparent text-sm font-semibold leading-5 outline-none placeholder:text-[#B2A693]"
                  />
                </label>
              </div>

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
              {activeJourney && (
                <button
                  type="button"
                  onClick={() => router.push(`/journey/${activeJourney.id}`)}
                  className="mb-3 flex w-full items-center justify-between rounded-[22px] border border-[#D9CCB8] bg-[#FFF9EF] px-5 py-4 text-left"
                >
                  <span>
                    <span className="block text-sm font-black">继续当前旅程</span>
                    <span className="mt-1 block text-xs text-[#8B8174]">
                      {activeJourney.destination} · {dateLabel(String(activeJourney.startDate))}
                    </span>
                  </span>
                  <ArrowRight size={18} className="text-[#C86B4A]" />
                </button>
              )}
              <button
                onClick={launch}
                disabled={isLaunching || isImporting || isLoadingActiveJourney || isStandardizingDestination}
                className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-[#1E1712] px-6 py-5 text-base font-black text-white shadow-[0_16px_40px_rgba(30,23,18,0.18)] disabled:opacity-60"
              >
                {isLaunching || isStandardizingDestination ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ArrowRight size={18} />
                )}
                {isStandardizingDestination ? "整理地点中" : "开启织流"}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
