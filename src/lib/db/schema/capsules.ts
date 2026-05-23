import type { InferSelectModel } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const capsules = pgTable(
  "capsules",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    journeyId: varchar("journey_id", { length: 128 }).notNull(),
    userId: varchar("user_id", { length: 128 }).notNull(),
    title: text("title").notNull(),
    location: text("location"),
    userRawText: text("user_raw_text"),
    aiContent: text("ai_content"),
    aiContentStyle: varchar("ai_content_style", { length: 32 }).notNull().default("cinematic"),
    keywords: text("keywords").array(),
    eventType: varchar("event_type", { length: 16 }).notNull().default("text"),
    audioUrl: text("audio_url"),
    audioDurationSeconds: integer("audio_duration_seconds"),
    photoCount: integer("photo_count").notNull().default(0),
    photoUrls: text("photo_urls").array(),
    videoUrls: text("video_urls").array(),
    travelDate: timestamp("travel_date").notNull().defaultNow(),
    dayNumber: integer("day_number").notNull().default(1),
    capturedAt: timestamp("captured_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    journeyIdIdx: index("capsules_journey_id_idx").on(table.journeyId),
    userIdIdx: index("capsules_user_id_idx").on(table.userId),
    travelDateIdx: index("capsules_travel_date_idx").on(table.travelDate),
    dayNumberIdx: index("capsules_day_number_idx").on(table.dayNumber),
    capturedAtIdx: index("capsules_captured_at_idx").on(table.capturedAt),
  })
);

export type Capsule = InferSelectModel<typeof capsules>;
