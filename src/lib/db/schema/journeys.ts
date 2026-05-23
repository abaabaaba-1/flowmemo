import type { InferSelectModel } from "drizzle-orm";
import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const journeys = pgTable(
  "journeys",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    userId: varchar("user_id", { length: 128 }).notNull(),
    destination: text("destination").notNull(),
    destinationCountryRegion: text("destination_country_region"),
    destinationCity: text("destination_city"),
    destinationPlace: text("destination_place"),
    destinationNote: text("destination_note"),
    description: text("description"),
    startDate: timestamp("start_date").notNull().defaultNow(),
    endDate: timestamp("end_date"),
    isActive: varchar("is_active", { length: 8 }).notNull().default("true"),
    coverImageUrl: text("cover_image_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("journeys_user_id_idx").on(table.userId),
    destinationCityIdx: index("journeys_destination_city_idx").on(table.destinationCity),
    createdAtIdx: index("journeys_created_at_idx").on(table.createdAt),
  })
);

export type Journey = InferSelectModel<typeof journeys>;
