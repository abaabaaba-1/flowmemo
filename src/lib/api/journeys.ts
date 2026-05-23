import type { Journey } from "@/lib/journey-types";
import type { DestinationInput } from "@/lib/destination";
import { parseJsonResponse, request } from "./request";

export interface CreateJourneyInput extends DestinationInput {
  description?: string;
  startDate?: string;
  endDate?: string;
}

export async function getActiveJourney(): Promise<Journey | null> {
  const response = await request("/api/journeys");
  return parseJsonResponse<Journey | null>(response, "加载当前旅程失败");
}

export async function getJourneyById(journeyId: string): Promise<Journey | null> {
  const response = await request(`/api/journeys?id=${encodeURIComponent(journeyId)}`);
  return parseJsonResponse<Journey | null>(response, "加载旅程失败");
}

export async function getJourneys(): Promise<Journey[]> {
  const response = await request("/api/journeys?all=true");
  return parseJsonResponse<Journey[]>(response, "加载旅程列表失败");
}

export async function createJourney(input: CreateJourneyInput): Promise<Journey> {
  const response = await request("/api/journeys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse<Journey>(response, "创建旅程失败");
}
