import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { capsules } from "../schema/capsules";
import type { Capsule } from "../schema/capsules";

export async function getCapsulesByJourney(journeyId: string, userId: string): Promise<Capsule[]> {
  return db
    .select()
    .from(capsules)
    .where(and(eq(capsules.journeyId, journeyId), eq(capsules.userId, userId)))
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
  photoUrls?: string[];
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
      photoUrls: data.photoUrls ?? [],
      photoCount: (data.photoUrls ?? []).length,
    })
    .returning();
  return rows[0];
}

export async function updateCapsule(
  id: string,
  userId: string,
  data: Partial<{
    title: string;
    aiContent: string;
    aiContentStyle: string;
    keywords: string[];
    photoUrls: string[];
    photoCount: number;
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
