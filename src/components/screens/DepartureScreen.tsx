"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileImage,
  ImagePlus,
  Loader2,
  MapPin,
  Mountain,
  Paperclip,
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

const WEEK_DAYS = ["一", "二", "三", "四", "五", "六", "日"];
const SHORT_WEEK_DAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const FULL_WEEK_DAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
type CalendarSelectionStep = "start" | "end";

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function firstDayOfMonth(value: string) {
  const date = parseIsoDate(value) ?? new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthLabel(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function calendarCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const leadingBlankCount = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return [
    ...Array.from({ length: leadingBlankCount }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
  ];
}

function dateLabel(value: string) {
  if (!value) return "选择日期";
  const date = parseIsoDate(value);
  if (!date) return value;
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function compactDateLabel(value: string) {
  const date = parseIsoDate(value);
  if (!date) return value;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}.${day} ${FULL_WEEK_DAYS[date.getDay()]}`;
}

function dateRangeLabel(startDate: string, endDate: string) {
  if (!startDate && !endDate) return "开始日期 结束日期";
  const start = compactDateLabel(startDate);
  if (!endDate || startDate === endDate) return start;
  return `${start} - ${compactDateLabel(endDate)}`;
}

function shortDateLabel(value: string) {
  const date = parseIsoDate(value);
  if (!date) return value || "未选择";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}.${day} ${SHORT_WEEK_DAYS[date.getDay()]}`;
}

function isBefore(left: string, right: string) {
  const leftDate = parseIsoDate(left);
  const rightDate = parseIsoDate(right);
  if (!leftDate || !rightDate) return false;
  return leftDate.getTime() < rightDate.getTime();
}

function isInRange(value: string, start?: string | null, end?: string | null) {
  if (!start) return false;
  const resolvedEnd = end ?? start;
  return value >= start && value <= resolvedEnd;
}

export function DepartureScreen() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [startDate, setStartDate] = useState("2026-11-08");
  const [endDate, setEndDate] = useState("2026-11-14");
  const [destinationText, setDestinationText] = useState("日本 · 伊豆 · 修善寺 · 东京");
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
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => firstDayOfMonth("2026-11-08"));
  const [calendarDraftStart, setCalendarDraftStart] = useState(startDate);
  const [calendarDraftEnd, setCalendarDraftEnd] = useState(endDate);
  const [calendarSelectionStep, setCalendarSelectionStep] = useState<CalendarSelectionStep>("start");

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

  function applyDateRange(nextStartDate: string, nextEndDate: string) {
    setStartDate(nextStartDate);
    setEndDate(isBefore(nextEndDate, nextStartDate) ? nextStartDate : nextEndDate);
  }

  function applyStartDate(nextStartDate: string) {
    setStartDate(nextStartDate);
    setVisibleMonth(firstDayOfMonth(nextStartDate));
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
    applyDateRange(resolvedStartDate, resolvedEndDate);
    setVisibleMonth(firstDayOfMonth(resolvedStartDate));
  }

  function currentDestinationInput(): DestinationInput {
    const hasDestinationText = destinationText.trim().length > 0;

    return {
      destination: destinationText,
      destinationCountryRegion: hasDestinationText ? destinationCountryRegion : "",
      destinationCity: hasDestinationText ? destinationCity : "",
      destinationPlace: hasDestinationText ? destinationPlace : "",
      destinationNote: hasDestinationText ? destinationNote : "",
    };
  }

  function applyDestinationInput(input: DestinationInput) {
    const standardized = standardizeDestinationLocal(input);
    setDestinationText(standardized.destination);
    setDestinationCountryRegion(standardized.destinationCountryRegion);
    setDestinationCity(standardized.destinationCity);
    setDestinationPlace(standardized.destinationPlace);
    setDestinationNote(standardized.destinationNote);
  }

  function updateDestinationText(nextDestination: string) {
    setDestinationText(nextDestination);
    const standardized = standardizeDestinationLocal({ destination: nextDestination });
    setDestinationCountryRegion(standardized.destinationCountryRegion);
    setDestinationCity(standardized.destinationCity);
    setDestinationPlace(standardized.destinationPlace);
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
    if (isBefore(endDate, startDate)) {
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
        applyDateRange("2026-11-08", "2026-11-14");
        setVisibleMonth(firstDayOfMonth("2026-11-08"));
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

  function openCalendar() {
    setCalendarDraftStart(startDate);
    setCalendarDraftEnd(endDate);
    setCalendarSelectionStep("start");
    setVisibleMonth(firstDayOfMonth(startDate));
    setIsCalendarOpen(true);
  }

  function closeCalendar() {
    setIsCalendarOpen(false);
  }

  function selectCalendarDate(date: Date) {
    const nextDate = toIsoDate(date);

    if (calendarSelectionStep === "start") {
      setCalendarDraftStart(nextDate);
      setCalendarDraftEnd((currentEndDate) =>
        currentEndDate && !isBefore(currentEndDate, nextDate) ? currentEndDate : ""
      );
      setCalendarSelectionStep("end");
      return;
    }

    if (!calendarDraftStart || isBefore(nextDate, calendarDraftStart)) {
      setCalendarDraftStart(nextDate);
      setCalendarDraftEnd("");
      setCalendarSelectionStep("end");
      return;
    }

    setCalendarDraftEnd(nextDate);
    setCalendarSelectionStep("start");
  }

  function confirmCalendarDates() {
    if (calendarDraftStart) {
      applyDateRange(calendarDraftStart, calendarDraftEnd || calendarDraftStart);
    }
    closeCalendar();
  }

  function renderCalendarMonth(monthDate: Date) {
    const todayIso = toIsoDate(new Date());
    const selectedEnd = calendarDraftEnd || calendarDraftStart;

    return (
      <section key={monthDate.toISOString()} className="mt-8 first:mt-0">
        <h3 className="mb-4 text-xl font-bold text-black">{monthLabel(monthDate)}</h3>
        <div className="grid grid-cols-7 gap-y-3 text-center">
          {calendarCells(monthDate).map((date, index) => {
            if (!date) return <div key={`blank-${index}`} className="h-12" />;

            const dayIso = toIsoDate(date);
            const selected = isInRange(dayIso, calendarDraftStart, selectedEnd);
            const isStart = dayIso === calendarDraftStart;
            const isEnd = dayIso === selectedEnd;
            const isSingleSelection = selected && isStart && isEnd;
            const isToday = dayIso === todayIso;
            const hasRangeFill = selected && !isSingleSelection;
            const weekIndex = (date.getDay() + 6) % 7;
            const shouldConnectAfter = hasRangeFill && isStart && weekIndex < 6;
            const shouldConnectBefore = hasRangeFill && isEnd && weekIndex > 0;

            return (
              <button
                key={dayIso}
                type="button"
                onClick={() => selectCalendarDate(date)}
                className="relative flex h-12 w-full select-none flex-col items-center justify-center"
                aria-pressed={selected}
                aria-label={`${monthDate.getFullYear()}年${monthDate.getMonth() + 1}月${date.getDate()}日`}
              >
                {shouldConnectAfter && <span className="absolute inset-y-0 right-0 w-1/2 bg-[#5a5a5a]" />}
                {shouldConnectBefore && <span className="absolute inset-y-0 left-0 w-1/2 bg-[#5a5a5a]" />}
                {hasRangeFill && !isStart && !isEnd && <span className="absolute inset-0 bg-[#5a5a5a]" />}
                {selected && (isStart || isEnd) && <span className="absolute h-11 w-11 rounded-full bg-black" />}
                {!selected && isToday && (
                  <span className="absolute h-11 w-11 rounded-full border border-[#d6efff] bg-[#f0f9ff]" />
                )}
                <span
                  className={[
                    "relative z-10 text-[17px] font-semibold",
                    selected ? "text-white" : isToday ? "text-[#47b2ff]" : "text-black",
                  ].join(" ")}
                >
                  {date.getDate()}
                </span>
                {!selected && isToday && (
                  <span className="absolute bottom-[-4px] z-10 text-[10px] font-medium text-[#47b2ff]">今</span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <main className="journey-shell journey-ambient relative flex min-h-svh overflow-hidden text-gray-800">
      <AnimatePresence mode="wait">
        {showTransition ? (
          <motion.section
            key="transition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-svh w-full flex-col items-center justify-center px-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7 }}
              className="relative flex h-56 w-56 items-center justify-center rounded-full border border-white/60 bg-white/50 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-2xl"
            >
              <Mountain size={96} strokeWidth={1.2} className="text-[#6BA7D8]" />
              <div className="absolute bottom-12 h-px w-28 bg-[#F3BE4E]/60" />
              <div className="absolute bottom-9 h-px w-20 bg-[#6BA7D8]/50" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 text-sm font-semibold tracking-[0.22em] text-gray-500"
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
            className="relative z-10 mx-auto flex h-svh w-full max-w-[430px] flex-col"
          >
            <div className="flex h-12 w-full shrink-0 items-center justify-between px-8 text-gray-800">
              <div className="text-[15px] font-semibold">15:13</div>
              <div className="flex items-center gap-2">
                <div className="flex h-4 items-end gap-[2px]" aria-hidden="true">
                  <span className="h-1.5 w-1 rounded-full bg-gray-700" />
                  <span className="h-2.5 w-1 rounded-full bg-gray-700" />
                  <span className="h-3.5 w-1 rounded-full bg-gray-700" />
                </div>
                <div className="relative h-4 w-5" aria-hidden="true">
                  <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full border-2 border-gray-700 border-l-transparent border-t-transparent rotate-45" />
                  <span className="absolute bottom-0 left-[5px] h-2 w-2 rounded-full border-2 border-gray-700 border-l-transparent border-t-transparent rotate-45" />
                </div>
                <div
                  className="relative flex h-3 w-6 items-center rounded-sm border border-gray-500 px-0.5"
                  aria-hidden="true"
                >
                  <div className="h-2 w-3 rounded-[1px] bg-emerald-500" />
                  <span className="absolute -right-1 top-1/2 h-1.5 w-0.5 -translate-y-1/2 rounded-r bg-gray-500" />
                </div>
              </div>
            </div>

            <div className="journey-no-scrollbar flex-1 overflow-y-auto px-8 pt-12">
              <h1 className="mb-14 text-[32px] font-bold leading-tight tracking-normal text-gray-800">
                请填写
                <br />
                行程信息
              </h1>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="ml-1 block text-sm font-medium text-gray-500">出行日期</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={openCalendar}
                      className="journey-liquid-glass flex w-full items-center justify-between rounded-[22px] px-6 py-5 text-left transition-transform active:scale-[0.98]"
                    >
                      <span className="min-w-0 truncate text-[17px] font-medium tracking-wide text-gray-800">
                        {dateRangeLabel(startDate, endDate)}
                      </span>
                      <CalendarDays size={25} className="shrink-0 text-gray-400" />
                    </button>
                    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                      <input
                        type="date"
                        value={startDate}
                        onInput={(event) => applyStartDate(event.currentTarget.value)}
                        onChange={(event) => applyStartDate(event.target.value)}
                        onBlur={(event) => applyStartDate(event.currentTarget.value)}
                        className="absolute left-0 top-0 h-full w-1/2 opacity-0"
                        aria-label="去程日期"
                      />
                      <input
                        type="date"
                        value={endDate}
                        min={startDate || undefined}
                        onInput={(event) => applyEndDate(event.currentTarget.value)}
                        onChange={(event) => applyEndDate(event.target.value)}
                        onBlur={(event) => applyEndDate(event.currentTarget.value)}
                        className="absolute right-0 top-0 h-full w-1/2 opacity-0"
                        aria-label="返程日期"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="ml-1 block text-sm font-medium text-gray-500">目的地</label>
                  <div className="journey-liquid-glass flex items-center justify-between rounded-[22px] px-6 py-5 transition-colors focus-within:bg-white/60">
                    <input
                      value={destinationText}
                      onChange={(event) => updateDestinationText(event.target.value)}
                      placeholder="请输入目的地"
                      className="min-w-0 flex-1 bg-transparent text-[17px] font-medium tracking-wide text-gray-800 outline-none placeholder:text-gray-400"
                    />
                    <MapPin size={25} className="ml-2 shrink-0 text-red-400" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="journey-liquid-glass flex w-full items-center gap-3 rounded-[22px] px-5 py-4 text-left transition-transform active:scale-[0.98]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#2563EB] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                    {isImporting ? (
                      <Loader2 size={19} className="animate-spin" />
                    ) : importedName ? (
                      <FileImage size={19} />
                    ) : (
                      <Paperclip size={19} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold leading-5 text-gray-800">智能导入行程</span>
                    <span className="mt-1 block truncate text-xs font-medium leading-5 text-gray-500">
                      {importedName || "机票、酒店订单、行程截图"}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white/65 px-3 py-1.5 text-xs font-bold text-[#2563EB] shadow-sm ring-1 ring-white/70">
                    {importedName ? <ImagePlus size={15} /> : "选择图片"}
                  </span>
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
            </div>

            <div className="relative z-20 shrink-0 p-8 pb-10">
              {activeJourney && (
                <button
                  type="button"
                  onClick={() => router.push(`/journey/${activeJourney.id}`)}
                  className="journey-liquid-glass mb-3 flex w-full items-center justify-between rounded-[22px] px-5 py-4 text-left"
                >
                  <span>
                    <span className="block text-sm font-bold text-gray-800">继续当前旅程</span>
                    <span className="mt-1 block text-xs text-gray-500">
                      {activeJourney.destination} · {dateLabel(String(activeJourney.startDate))}
                    </span>
                  </span>
                  <ArrowRight size={18} className="text-blue-600" />
                </button>
              )}
              <button
                type="button"
                onClick={launch}
                disabled={isLaunching || isImporting || isLoadingActiveJourney || isStandardizingDestination}
                className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-[#333333] px-6 py-4 text-[17px] font-semibold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-60"
              >
                {isLaunching || isStandardizingDestination ? <Loader2 size={18} className="animate-spin" /> : null}
                {isStandardizingDestination ? "整理地点中" : "开始记录"}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCalendarOpen && (
          <>
            <motion.button
              key="calendar-backdrop"
              type="button"
              aria-label="关闭日期选择"
              className="fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24 }}
              onClick={closeCalendar}
            />
            <motion.section
              key="calendar-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="选择出行日期"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex h-[80svh] max-h-[720px] max-w-[430px] flex-col rounded-t-3xl bg-white shadow-2xl"
            >
              <button type="button" onClick={closeCalendar} className="flex w-full justify-center px-6 pb-2 pt-3">
                <span className="h-1 w-8 rounded-full bg-gray-300" />
              </button>

              <div className="journey-no-scrollbar flex-1 overflow-y-auto px-6 pb-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="mt-2 text-[26px] font-bold tracking-normal text-black">选择出行日期</h2>
                    <p className="mt-1 text-xs font-medium text-gray-400">时区: 北京 GMT +8:00</p>
                  </div>
                  <div className="mt-3 flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label="上一个月"
                      onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      aria-label="下一个月"
                      onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>

                <div className="my-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCalendarSelectionStep("start")}
                    className={[
                      "rounded-[18px] px-4 py-3 text-left ring-1 transition-colors",
                      calendarSelectionStep === "start"
                        ? "bg-black text-white ring-black"
                        : "bg-gray-50 text-gray-900 ring-gray-100",
                    ].join(" ")}
                  >
                    <span className="block text-xs font-semibold opacity-60">出发</span>
                    <span className="mt-1 block text-[16px] font-bold">{shortDateLabel(calendarDraftStart)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarSelectionStep("end")}
                    className={[
                      "rounded-[18px] px-4 py-3 text-left ring-1 transition-colors",
                      calendarSelectionStep === "end"
                        ? "bg-black text-white ring-black"
                        : "bg-gray-50 text-gray-900 ring-gray-100",
                    ].join(" ")}
                  >
                    <span className="block text-xs font-semibold opacity-60">返程</span>
                    <span className="mt-1 block text-[16px] font-bold">{shortDateLabel(calendarDraftEnd)}</span>
                  </button>
                </div>

                <div className="mb-5 grid grid-cols-7 text-center text-[13px] font-medium text-gray-400">
                  {WEEK_DAYS.map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>

                {[visibleMonth, addMonths(visibleMonth, 1)].map((monthDate) => renderCalendarMonth(monthDate))}
              </div>

              <div className="shrink-0 border-t border-gray-100 bg-white/95 px-6 pb-8 pt-4">
                <button
                  type="button"
                  onClick={confirmCalendarDates}
                  className="w-full rounded-full bg-black px-12 py-3.5 text-[17px] font-medium text-white shadow-xl shadow-black/20 transition-transform active:scale-95"
                >
                  确定
                </button>
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
