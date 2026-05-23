import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCapsulesByJourney, createCapsule } from "@/lib/db/queries/capsules";
import { getJourneyById } from "@/lib/db/queries/journeys";
import { CAPSULE_EVENT_TYPES, type CapsuleEventType } from "@/lib/journey-types";
import { validateAudioUrl, validatePhotoUrls, validateVideoUrls } from "@/lib/media-validation";
import { dateKeyToDate, getJourneyDayNumber, toDateKey } from "@/lib/journey-date";
import { nanoid } from "@/lib/utils";

function normalizeKeywords(input: unknown) {
  if (input === undefined || input === null) return undefined;
  if (!Array.isArray(input)) return null;
  return input
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeEventType(input: unknown): CapsuleEventType | null {
  if (input === undefined || input === null || input === "") return "text";
  if (typeof input !== "string") return null;
  return (CAPSULE_EVENT_TYPES as string[]).includes(input) ? (input as CapsuleEventType) : null;
}

function normalizeDuration(input: unknown) {
  if (input === undefined || input === null || input === "") return undefined;
  const duration = Number(input);
  if (!Number.isFinite(duration) || duration < 0 || duration > 3600) return null;
  return Math.round(duration);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ journeyId: string }> }
) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;
  const { id: userId } = auth.user;
  const { journeyId } = await params;
  const travelDateKey = toDateKey(request.nextUrl.searchParams.get("travelDate"));
  const dayNumber = Number(request.nextUrl.searchParams.get("dayNumber"));

  const capsules = await getCapsulesByJourney(journeyId, userId, {
    ...(travelDateKey ? { travelDate: dateKeyToDate(travelDateKey) } : {}),
    ...(Number.isInteger(dayNumber) && dayNumber > 0 ? { dayNumber } : {}),
  });
  return NextResponse.json(capsules);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ journeyId: string }> }
) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;
  const { id: userId } = auth.user;
  const { journeyId } = await params;

  const body = await request.json();
  const {
    title,
    location,
    userRawText,
    aiContent,
    keywords,
    eventType,
    audioUrl,
    audioDurationSeconds,
    photoUrls,
    videoUrls,
  } = body;

  const journey = await getJourneyById(journeyId, userId);
  if (!journey) {
    return NextResponse.json({ error: "旅程不存在或无权限" }, { status: 404 });
  }

  if (!title?.trim()) {
    return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  }

  const normalizedKeywords = normalizeKeywords(keywords);
  if (normalizedKeywords === null) {
    return NextResponse.json({ error: "关键词列表格式无效" }, { status: 400 });
  }

  const normalizedEventType = normalizeEventType(eventType);
  if (!normalizedEventType) {
    return NextResponse.json({ error: "事件类型无效" }, { status: 400 });
  }

  const normalizedDuration = normalizeDuration(audioDurationSeconds);
  if (normalizedDuration === null) {
    return NextResponse.json({ error: "语音时长无效" }, { status: 400 });
  }

  const audioValidation = validateAudioUrl(audioUrl);
  if (!audioValidation.ok) {
    return NextResponse.json(
      { error: audioValidation.error },
      { status: audioValidation.status }
    );
  }

  const photoValidation = validatePhotoUrls(photoUrls);
  if (!photoValidation.ok) {
    return NextResponse.json(
      { error: photoValidation.error },
      { status: photoValidation.status }
    );
  }

  const videoValidation = validateVideoUrls(videoUrls);
  if (!videoValidation.ok) {
    return NextResponse.json(
      { error: videoValidation.error },
      { status: videoValidation.status }
    );
  }

  const travelDateKey = toDateKey(body.travelDate) || toDateKey(journey.startDate);
  const travelDate = dateKeyToDate(travelDateKey);
  const bodyDayNumber = Number(body.dayNumber);
  const dayNumber =
    Number.isInteger(bodyDayNumber) && bodyDayNumber > 0
      ? bodyDayNumber
      : getJourneyDayNumber(travelDate, journey.startDate);

  const capsule = await createCapsule({
    id: nanoid(),
    journeyId,
    userId,
    title: title.trim(),
    location,
    userRawText,
    aiContent,
    keywords: normalizedKeywords,
    eventType: normalizedEventType,
    audioUrl: audioValidation.audioUrl,
    audioDurationSeconds: normalizedDuration,
    photoUrls: photoValidation.photoUrls ?? undefined,
    videoUrls: videoValidation.videoUrls ?? undefined,
    travelDate,
    dayNumber,
  });

  return NextResponse.json(capsule, { status: 201 });
}
