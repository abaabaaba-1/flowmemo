import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { updateCapsule, deleteCapsule } from "@/lib/db/queries/capsules";
import { dateKeyToDate, toDateKey } from "@/lib/journey-date";
import { CAPSULE_EVENT_TYPES, type CapsuleEventType } from "@/lib/journey-types";
import { validateAudioUrl, validatePhotoUrls, validateVideoUrls } from "@/lib/media-validation";

const STYLE_KEYS = new Set(["cinematic", "healing", "xiaohongshu", "poetic", "funny"]);

function normalizeNullableText(input: unknown) {
  if (input === undefined) return undefined;
  if (input === null) return null;
  return typeof input === "string" ? input.trim() : null;
}

function normalizeEventType(input: unknown): CapsuleEventType | null {
  if (typeof input !== "string") return null;
  return (CAPSULE_EVENT_TYPES as string[]).includes(input) ? (input as CapsuleEventType) : null;
}

function normalizeDuration(input: unknown) {
  if (input === undefined || input === null || input === "") return null;
  const duration = Number(input);
  if (!Number.isFinite(duration) || duration < 0 || duration > 3600) return undefined;
  return Math.round(duration);
}

function normalizeKeywords(input: unknown) {
  if (input === undefined) return undefined;
  if (input === null) return [];
  if (!Array.isArray(input)) return null;
  return input
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .slice(0, 8);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ capsuleId: string }> }
) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;
  const { id: userId } = auth.user;
  const { capsuleId } = await params;

  const body = await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "请求体格式无效" }, { status: 400 });
  }

  const updateData: Parameters<typeof updateCapsule>[2] = {};

  if ("title" in body) {
    const title = normalizeNullableText(body.title);
    if (!title) {
      return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    }
    updateData.title = title;
  }

  if ("location" in body) {
    const location = normalizeNullableText(body.location);
    if (location === null && body.location !== null) {
      return NextResponse.json({ error: "地点格式无效" }, { status: 400 });
    }
    updateData.location = location;
  }

  if ("userRawText" in body) {
    const userRawText = normalizeNullableText(body.userRawText);
    if (userRawText === null && body.userRawText !== null) {
      return NextResponse.json({ error: "原始文本格式无效" }, { status: 400 });
    }
    updateData.userRawText = userRawText;
  }

  if ("aiContent" in body) {
    const aiContent = normalizeNullableText(body.aiContent);
    if (aiContent === null && body.aiContent !== null) {
      return NextResponse.json({ error: "AI 文案格式无效" }, { status: 400 });
    }
    updateData.aiContent = aiContent;
  }

  if ("aiContentStyle" in body) {
    if (typeof body.aiContentStyle !== "string" || !STYLE_KEYS.has(body.aiContentStyle)) {
      return NextResponse.json({ error: "文案风格无效" }, { status: 400 });
    }
    updateData.aiContentStyle = body.aiContentStyle;
  }

  if ("keywords" in body) {
    const keywords = normalizeKeywords(body.keywords);
    if (keywords === null) {
      return NextResponse.json({ error: "关键词列表格式无效" }, { status: 400 });
    }
    updateData.keywords = keywords;
  }

  if ("eventType" in body) {
    const eventType = normalizeEventType(body.eventType);
    if (!eventType) {
      return NextResponse.json({ error: "事件类型无效" }, { status: 400 });
    }
    updateData.eventType = eventType;
  }

  if ("audioUrl" in body) {
    const audioValidation = validateAudioUrl(body.audioUrl);
    if (!audioValidation.ok) {
      return NextResponse.json(
        { error: audioValidation.error },
        { status: audioValidation.status }
      );
    }
    updateData.audioUrl = audioValidation.audioUrl;
  }

  if ("audioDurationSeconds" in body) {
    const duration = normalizeDuration(body.audioDurationSeconds);
    if (duration === undefined) {
      return NextResponse.json({ error: "语音时长无效" }, { status: 400 });
    }
    updateData.audioDurationSeconds = duration;
  }

  if ("photoUrls" in body) {
    const photoValidation = validatePhotoUrls(body.photoUrls);
    if (!photoValidation.ok) {
      return NextResponse.json(
        { error: photoValidation.error },
        { status: photoValidation.status }
      );
    }
    updateData.photoUrls = photoValidation.photoUrls ?? [];
    updateData.photoCount = updateData.photoUrls.length;
  }

  if ("videoUrls" in body) {
    const videoValidation = validateVideoUrls(body.videoUrls);
    if (!videoValidation.ok) {
      return NextResponse.json(
        { error: videoValidation.error },
        { status: videoValidation.status }
      );
    }
    updateData.videoUrls = videoValidation.videoUrls ?? [];
  }

  if ("travelDate" in body) {
    const travelDateKey = toDateKey(body.travelDate);
    if (!travelDateKey) {
      return NextResponse.json({ error: "旅行日期无效" }, { status: 400 });
    }
    updateData.travelDate = dateKeyToDate(travelDateKey);
  }

  if ("dayNumber" in body) {
    const dayNumber = Number(body.dayNumber);
    if (!Number.isInteger(dayNumber) || dayNumber <= 0) {
      return NextResponse.json({ error: "旅行天数无效" }, { status: 400 });
    }
    updateData.dayNumber = dayNumber;
  }

  const updated = await updateCapsule(capsuleId, userId, updateData);

  if (!updated) {
    return NextResponse.json({ error: "胶囊不存在或无权限" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ capsuleId: string }> }
) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;
  const { id: userId } = auth.user;
  const { capsuleId } = await params;

  const deleted = await deleteCapsule(capsuleId, userId);

  if (!deleted) {
    return NextResponse.json({ error: "胶囊不存在或无权限" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
