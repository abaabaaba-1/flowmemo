const DAY_MS = 24 * 60 * 60 * 1000;

export interface JourneyDateRange {
  startDate?: unknown;
  endDate?: unknown;
}

export interface JourneyDayOption {
  dateKey: string;
  dayNumber: number;
  label: string;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toDateKey(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  }

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return localDateKey(date);
}

export function dateKeyToDate(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00`);
}

export function resolveDefaultTravelDate(journey: JourneyDateRange | null | undefined) {
  const startKey = toDateKey(journey?.startDate);
  const endKey = toDateKey(journey?.endDate) || startKey;
  const todayKey = localDateKey(new Date());

  if (startKey && todayKey >= startKey && (!endKey || todayKey <= endKey)) {
    return todayKey;
  }

  return startKey || todayKey;
}

export function getJourneyDayNumber(travelDate: unknown, startDate: unknown): number {
  const travelKey = toDateKey(travelDate);
  const startKey = toDateKey(startDate) || travelKey;
  if (!travelKey || !startKey) return 1;

  const diff = dateKeyToDate(travelKey).getTime() - dateKeyToDate(startKey).getTime();
  return Math.max(1, Math.floor(diff / DAY_MS) + 1);
}

export function getJourneyDayOptions(journey: JourneyDateRange | null | undefined): JourneyDayOption[] {
  const startKey = toDateKey(journey?.startDate) || localDateKey(new Date());
  const endKey = toDateKey(journey?.endDate) || startKey;
  const startTime = dateKeyToDate(startKey).getTime();
  const endTime = Math.max(startTime, dateKeyToDate(endKey).getTime());
  const dayCount = Math.max(1, Math.floor((endTime - startTime) / DAY_MS) + 1);

  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(startTime + index * DAY_MS);
    const dateKey = localDateKey(date);
    return {
      dateKey,
      dayNumber: index + 1,
      label: date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }),
    };
  });
}

export function capsuleMatchesTravelDate(
  capsule: { travelDate?: unknown; capturedAt?: unknown },
  travelDate: string,
  fallbackDate?: unknown
) {
  const capsuleDate = toDateKey(capsule.travelDate) || toDateKey(capsule.capturedAt) || toDateKey(fallbackDate);
  return capsuleDate === travelDate;
}
