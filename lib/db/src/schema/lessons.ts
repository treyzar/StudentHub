import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { subjectsTable } from "./subjects";

export const lessonsTable = pgTable("lessons", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjectsTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  location: text("location"),
  teacher: text("teacher"),
  source: text("source").notNull().default("manual"),
  externalId: text("external_id"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Lesson = typeof lessonsTable.$inferSelect;
