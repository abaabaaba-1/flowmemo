import type { Journey } from "@/lib/journey-types";
import { DEMO_JOURNEY, DEMO_PHOTOS } from "@/lib/demo-data";
import { getStoredDemoJourneyDraft } from "@/lib/demo-session";

export const HISTORY_COVER_PAIRS = [
  [DEMO_PHOTOS.bamboo1, DEMO_PHOTOS.bamboo_upward],
  [DEMO_PHOTOS.izu_coast, DEMO_PHOTOS.japan_waves],
  [DEMO_PHOTOS.sushi, DEMO_PHOTOS.tokyo_night],
  [DEMO_PHOTOS.shinjuku_rain, DEMO_PHOTOS.shrine],
];

export function formatHistoryDate(value: unknown) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "未定日期";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

export function historyCoverPhotos(journey: Journey, index: number) {
  const fallback = HISTORY_COVER_PAIRS[index % HISTORY_COVER_PAIRS.length];
  return journey.coverImageUrl ? [fallback[0], journey.coverImageUrl] : fallback;
}

export function buildLocalHistoryJourneys(): Journey[] {
  const draft = getStoredDemoJourneyDraft();
  const now = new Date();
  const source = draft
    ? {
        ...DEMO_JOURNEY,
        destination: draft.destination,
        destinationCountryRegion: draft.destinationCountryRegion ?? "",
        destinationCity: draft.destinationCity ?? "",
        destinationPlace: draft.destinationPlace ?? "",
        destinationNote: draft.destinationNote ?? "",
        description: draft.importedFrom ? `由 ${draft.importedFrom} 导入` : DEMO_JOURNEY.description,
        startDate: new Date(draft.startDate),
        endDate: new Date(draft.endDate),
      }
    : DEMO_JOURNEY;

  return [
    {
      id: source.id,
      userId: "demo-user",
      destination: source.destination,
      destinationCountryRegion: source.destinationCountryRegion,
      destinationCity: source.destinationCity,
      destinationPlace: source.destinationPlace,
      destinationNote: source.destinationNote,
      description: source.description,
      startDate: source.startDate,
      endDate: source.endDate,
      isActive: "true",
      coverImageUrl: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
}
