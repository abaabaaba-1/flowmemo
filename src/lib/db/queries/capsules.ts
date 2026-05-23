import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "../client";
import { capsules } from "../schema/capsules";
import type { Capsule } from "../schema/capsules";

export interface CapsuleFilters {
  travelDate?: Date;
  dayNumber?: number;
}

export async function getCapsulesByJourney(
  journeyId: string,
  userId: string,
  filters: CapsuleFilters = {}
): Promise<Capsule[]> {
  const conditions = [eq(capsules.journeyId, journeyId), eq(capsules.userId, userId)];

  if (filters.travelDate) {
    const start = new Date(filters.travelDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    conditions.push(gte(capsules.travelDate, start), lt(capsules.travelDate, end));
  }

  if (filters.dayNumber) {
    conditions.push(eq(capsules.dayNumber, filters.dayNumber));
  }

  return db
    .select()
    .from(capsules)
    .where(and(...conditions))
    .orderBy(asc(capsules.capturedAt));
}

export async function getCapsuleById(id: string, userId: string): Promise<Capsule | null> {
  const rows = await db
    .select()
    .from(capsules)
    .where(and(eq(capsules.id, id), eq(capsules.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createCapsule(data: {
  id: string;
  journeyId: string;
  userId: string;
  title: string;
  location?: string;
  userRawText?: string;
  aiContent?: string;
  keywords?: string[];
  eventType?: string;
  audioUrl?: string | null;
  audioDurationSeconds?: number | null;
  photoUrls?: string[];
  videoUrls?: string[];
  travelDate?: Date;
  dayNumber?: number;
}): Promise<Capsule> {
  const rows = await db
    .insert(capsules)
    .values({
      id: data.id,
      journeyId: data.journeyId,
      userId: data.userId,
      title: data.title,
      location: data.location ?? null,
      userRawText: data.userRawText ?? null,
      aiContent: data.aiContent ?? null,
      keywords: data.keywords ?? [],
      eventType: data.eventType ?? "text",
      audioUrl: data.audioUrl ?? null,
      audioDurationSeconds: data.audioDurationSeconds ?? null,
      photoUrls: data.photoUrls ?? [],
      photoCount: (data.photoUrls ?? []).length,
      videoUrls: data.videoUrls ?? [],
      travelDate: data.travelDate ?? new Date(),
      dayNumber: data.dayNumber ?? 1,
    })
    .returning();
  return rows[0];
}

export async function updateCapsule(
  id: string,
  userId: string,
  data: Partial<{
    title: string;
    location: string | null;
    userRawText: string | null;
    aiContent: string | null;
    aiContentStyle: string;
    keywords: string[];
    eventType: string;
    audioUrl: string | null;
    audioDurationSeconds: number | null;
    photoUrls: string[];
    photoCount: number;
    videoUrls: string[];
    travelDate: Date;
    dayNumber: number;
  }>
): Promise<Capsule | null> {
  const rows = await db
    .update(capsules)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(capsules.id, id), eq(capsules.userId, userId)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteCapsule(id: string, userId: string): Promise<boolean> {
  const rows = await db
    .delete(capsules)
    .where(and(eq(capsules.id, id), eq(capsules.userId, userId)))
    .returning({ id: capsules.id });
  return rows.length > 0;
}

export async function getLatestCapsules(userId: string, limit = 5): Promise<Capsule[]> {
  return db
    .select()
    .from(capsules)
    .where(eq(capsules.userId, userId))
    .orderBy(desc(capsules.capturedAt))
    .limit(limit);
}
