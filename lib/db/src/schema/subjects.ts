import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const subjectsTable = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  teacher: text("teacher"),
  color: text("color").notNull().default("#6366f1"),
  description: text("description"),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Subject = typeof subjectsTable.$inferSelect;
