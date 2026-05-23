import type { Capsule, StyleKey } from "@/lib/journey-types";
import type { DestinationInput, StandardizedDestination } from "@/lib/destination";
import { parseJsonResponse, readTextResponse, request } from "./request";

export interface CapsuleDraft {
  title?: string;
  location?: string;
  keywords?: string[];
  content?: string;
}

export interface AnalyzeImageResult {
  scene?: string;
  location?: string;
  tags?: string[];
  mood?: string;
  emotion?: string;
  suggestedCaption?: string;
}

export interface ImportItineraryResult extends Partial<StandardizedDestination> {
  destination?: string;
  startDate?: string;
  endDate?: string;
  title?: string;
}

export interface DirectorNotes {
  storyArc: string;
  socialHook: string;
  missingShot: string;
  nextPrompt: string;
  score: number;
}

export type PromptSuggestionIntent = "ask" | "note";

export interface PromptSuggestion {
  intent: PromptSuggestionIntent;
  label: string;
  text: string;
}

function parseJsonPayload<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    return JSON.parse(match?.[0] ?? cleaned) as T;
  } catch {
    return fallback;
  }
}

export async function composeCapsuleDraft(input: {
  userText: string;
  style?: StyleKey;
  demoMode?: boolean;
}): Promise<CapsuleDraft> {
  const response = await request("/api/ai/compose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userText: input.userText,
      style: input.style ?? "cinematic",
      demoMode: input.demoMode ?? false,
    }),
  });
  const text = await readTextResponse(response, "生成记忆文案失败");
  return parseJsonPayload<CapsuleDraft>(text, { title: "旅途记忆", content: text });
}

export async function rewriteCapsuleContent(input: {
  existingContent?: string | null;
  style: StyleKey;
  travelDate?: string;
  demoMode?: boolean;
  onChunk?: (fullText: string) => void;
}): Promise<string> {
  const response = await request("/api/ai/compose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      existingContent: input.existingContent,
      style: input.style,
      demoMode: input.demoMode ?? false,
    }),
  });
  return readTextResponse(response, "改写记忆文案失败", (_chunk, fullText) => {
    input.onChunk?.(fullText);
  });
}

export async function analyzeImage(input: {
  imageBase64: string;
  mimeType?: string;
  fileName?: string;
  demoMode?: boolean;
}): Promise<AnalyzeImageResult> {
  const response = await request("/api/ai/analyze-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse<AnalyzeImageResult>(response, "分析图片失败");
}

export async function importItineraryFromImage(input: {
  imageBase64: string;
  mimeType?: string;
  fileName?: string;
  demoMode?: boolean;
}): Promise<ImportItineraryResult> {
  const response = await request("/api/ai/import-itinerary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse<ImportItineraryResult>(response, "识别行程失败");
}

export async function standardizeDestination(
  input: DestinationInput & { demoMode?: boolean }
): Promise<StandardizedDestination> {
  const response = await request("/api/ai/standardize-destination", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse<StandardizedDestination>(response, "标准化目的地失败");
}

export async function streamTravelChat(input: {
  message: string;
  destination?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  notes?: Capsule[];
  demoMode?: boolean;
  signal?: AbortSignal;
  onChunk?: (fullText: string) => void;
}): Promise<string> {
  const response = await request("/api/ai/travel-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: input.message,
      destination: input.destination,
      startDate: input.startDate,
      endDate: input.endDate,
      notes: input.notes ?? [],
      demoMode: input.demoMode ?? false,
    }),
    signal: input.signal,
  });
  return readTextResponse(response, "旅行助手回复失败", (_chunk, fullText) => {
    input.onChunk?.(fullText);
  });
}

export async function generatePromptSuggestions(input: {
  destination?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  messages?: Array<{ role: string; content: string; kind?: string }>;
  notes?: Capsule[];
  demoMode?: boolean;
  signal?: AbortSignal;
}): Promise<PromptSuggestion[]> {
  const response = await request("/api/ai/prompt-suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      destination: input.destination,
      startDate: input.startDate,
      endDate: input.endDate,
      messages: input.messages ?? [],
      notes: input.notes ?? [],
      demoMode: input.demoMode ?? false,
    }),
    signal: input.signal,
  });
  const result = await parseJsonResponse<{ suggestions?: PromptSuggestion[] }>(
    response,
    "更新提示词失败"
  );
  return result.suggestions ?? [];
}

export async function generateDailyCanvas(input: {
  journeyId: string;
  style: StyleKey;
  travelDate?: string;
  demoMode?: boolean;
  destination?: string | null;
  capsules?: Capsule[];
  signal?: AbortSignal;
  onChunk?: (fullText: string) => void;
}): Promise<string> {
  const response = await request("/api/ai/daily-canvas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      journeyId: input.journeyId,
      style: input.style,
      travelDate: input.travelDate,
      demoMode: input.demoMode ?? false,
      destination: input.destination,
      capsules: input.capsules,
    }),
    signal: input.signal,
  });
  return readTextResponse(response, "生成今日画卷失败", (_chunk, fullText) => {
    input.onChunk?.(fullText);
  });
}

export async function getDirectorNotes(input: {
  journeyId: string;
  destination?: string | null;
  capsules: Capsule[];
}): Promise<DirectorNotes> {
  const response = await request("/api/ai/director-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse<DirectorNotes>(response, "整理导演建议失败");
}
