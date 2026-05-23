import type { Capsule, CapsuleEventType, StyleKey } from "@/lib/journey-types";
import { parseJsonResponse, request } from "./request";

export interface CreateCapsuleInput {
  title: string;
  location?: string | null;
  userRawText?: string | null;
  aiContent?: string | null;
  keywords?: string[] | null;
  eventType?: CapsuleEventType;
  audioUrl?: string | null;
  audioDurationSeconds?: number | null;
  photoUrls?: string[] | null;
  videoUrls?: string[] | null;
  travelDate?: string | Date | null;
  dayNumber?: number | null;
}

export interface UpdateCapsuleInput {
  title?: string;
  location?: string | null;
  userRawText?: string | null;
  aiContent?: string | null;
  aiContentStyle?: StyleKey;
  keywords?: string[] | null;
  eventType?: CapsuleEventType;
  audioUrl?: string | null;
  audioDurationSeconds?: number | null;
  photoUrls?: string[] | null;
  videoUrls?: string[] | null;
  travelDate?: string | Date | null;
  dayNumber?: number | null;
}

export interface GetJourneyCapsulesInput {
  travelDate?: string;
  dayNumber?: number;
}

export async function getJourneyCapsules(
  journeyId: string,
  input: GetJourneyCapsulesInput = {}
): Promise<Capsule[]> {
  const params = new URLSearchParams();
  if (input.travelDate) params.set("travelDate", input.travelDate);
  if (input.dayNumber) params.set("dayNumber", String(input.dayNumber));

  const query = params.toString();
  const response = await request(
    `/api/journeys/${encodeURIComponent(journeyId)}/capsules${query ? `?${query}` : ""}`
  );
  return parseJsonResponse<Capsule[]>(response, "加载记忆胶囊失败");
}

export async function createJourneyCapsule(
  journeyId: string,
  input: CreateCapsuleInput
): Promise<Capsule> {
  const response = await request(`/api/journeys/${encodeURIComponent(journeyId)}/capsules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse<Capsule>(response, "保存记忆胶囊失败");
}

export async function updateCapsule(
  capsuleId: string,
  input: UpdateCapsuleInput
): Promise<Capsule> {
  const response = await request(`/api/capsules/${encodeURIComponent(capsuleId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse<Capsule>(response, "更新记忆胶囊失败");
}
