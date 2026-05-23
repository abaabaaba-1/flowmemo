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
    photoCount: integer("photo_count").notNull().default(0),
    photoUrls: text("photo_urls").array(),
    capturedAt: timestamp("captured_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    journeyIdIdx: index("capsules_journey_id_idx").on(table.journeyId),
    userIdIdx: index("capsules_user_id_idx").on(table.userId),
    capturedAtIdx: index("capsules_captured_at_idx").on(table.capturedAt),
  })
);

export type Capsule = InferSelectModel<typeof capsules>;
