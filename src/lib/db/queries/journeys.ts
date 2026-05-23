import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { journeys } from "../schema/journeys";
import type { Journey } from "../schema/journeys";

export async function getActiveJourney(userId: string): Promise<Journey | null> {
  const rows = await db
    .select()
    .from(journeys)
    .where(and(eq(journeys.userId, userId), eq(journeys.isActive, "true")))
    .orderBy(desc(journeys.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getJourneysByUser(userId: string): Promise<Journey[]> {
  return db
    .select()
    .from(journeys)
    .where(eq(journeys.userId, userId))
    .orderBy(desc(journeys.createdAt));
}

export async function getJourneyById(id: string, userId: string): Promise<Journey | null> {
  const rows = await db
    .select()
    .from(journeys)
    .where(and(eq(journeys.id, id), eq(journeys.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createJourney(data: {
  id: string;
  userId: string;
  destination: string;
  destinationCountryRegion?: string;
  destinationCity?: string;
  destinationPlace?: string;
  destinationNote?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date | null;
  coverImageUrl?: string;
}): Promise<Journey> {
  const rows = await db
    .insert(journeys)
    .values({
      id: data.id,
      userId: data.userId,
      destination: data.destination,
      destinationCountryRegion: data.destinationCountryRegion || null,
      destinationCity: data.destinationCity || null,
      destinationPlace: data.destinationPlace || null,
      destinationNote: data.destinationNote || null,
      description: data.description ?? null,
      startDate: data.startDate ?? new Date(),
      endDate: data.endDate ?? null,
      coverImageUrl: data.coverImageUrl ?? null,
      isActive: "true",
    })
    .returning();
  return rows[0];
}

export async function deactivateJourney(id: string, userId: string): Promise<void> {
  await db
    .update(journeys)
    .set({ isActive: "false", updatedAt: new Date() })
    .where(and(eq(journeys.id, id), eq(journeys.userId, userId)));
}

export async function updateJourneyCover(id: string, userId: string, coverImageUrl: string): Promise<void> {
  await db
    .update(journeys)
    .set({ coverImageUrl, updatedAt: new Date() })
    .where(and(eq(journeys.id, id), eq(journeys.userId, userId)));
}
