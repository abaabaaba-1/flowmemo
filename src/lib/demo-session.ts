import type { Capsule } from "@/lib/journey-types";

const DEMO_CAPSULES_KEY = "flowmemo.demo.capsules";
const DEMO_JOURNEY_DRAFT_KEY = "flowmemo.demo.journey-draft";
const DEMO_PHOTO_POOL_KEY = "flowmemo.demo.photo-pool";

export interface DemoJourneyDraft {
  destination: string;
  destinationCountryRegion?: string;
  destinationCity?: string;
  destinationPlace?: string;
  destinationNote?: string;
  startDate: string;
  endDate: string;
  importedFrom?: string;
}

export interface DemoPhotoAnalysis {
  scene?: string;
  location?: string;
  mood?: string;
  emotion?: string;
  tags?: string[];
  suggestedCaption?: string;
}

export interface DemoPhotoAsset {
  id: string;
  url: string;
  label: string;
  tags: string[];
  location?: string;
  capturedAt?: string;
  source?: "demo" | "upload";
  isRetouched?: boolean;
  aiAnalysis?: DemoPhotoAnalysis;
  analysisStatus?: "pending" | "ready" | "failed";
}

function isBrowser() {
  return typeof window !== "undefined";
}

function isValidDateRange(startDate: string, endDate: string) {
  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);
  if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
    return false;
  }
  return parsedEndDate.getTime() >= parsedStartDate.getTime();
}

export function getStoredDemoCapsules(): Capsule[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(DEMO_CAPSULES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Capsule[]) : [];
  } catch {
    return [];
  }
}

export function storeDemoCapsules(capsules: Capsule[]) {
  if (!isBrowser()) return;

  const liveCapsules = capsules.filter((capsule) => capsule.id.startsWith("demo-live-"));
  window.localStorage.setItem(DEMO_CAPSULES_KEY, JSON.stringify(liveCapsules));
}

export function clearStoredDemoCapsules() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(DEMO_CAPSULES_KEY);
}

export function getStoredDemoJourneyDraft(): DemoJourneyDraft | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(DEMO_JOURNEY_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoJourneyDraft>;
    if (!parsed.destination || !parsed.startDate || !parsed.endDate) return null;
    if (!isValidDateRange(parsed.startDate, parsed.endDate)) return null;
    return {
      destination: parsed.destination,
      destinationCountryRegion: parsed.destinationCountryRegion,
      destinationCity: parsed.destinationCity,
      destinationPlace: parsed.destinationPlace,
      destinationNote: parsed.destinationNote,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      importedFrom: parsed.importedFrom,
    };
  } catch {
    return null;
  }
}

export function storeDemoJourneyDraft(draft: DemoJourneyDraft) {
  if (!isBrowser()) return;
  window.localStorage.setItem(DEMO_JOURNEY_DRAFT_KEY, JSON.stringify(draft));
}

export function getStoredDemoPhotoPool(): DemoPhotoAsset[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(DEMO_PHOTO_POOL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DemoPhotoAsset[]) : [];
  } catch {
    return [];
  }
}

export function storeDemoPhotoPool(photos: DemoPhotoAsset[]) {
  if (!isBrowser()) return;
  const uploaded = photos.filter((photo) => photo.source === "upload");
  window.localStorage.setItem(DEMO_PHOTO_POOL_KEY, JSON.stringify(uploaded));
}

export function clearStoredDemoJourney() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(DEMO_JOURNEY_DRAFT_KEY);
  window.localStorage.removeItem(DEMO_PHOTO_POOL_KEY);
  window.localStorage.removeItem(DEMO_CAPSULES_KEY);
}
