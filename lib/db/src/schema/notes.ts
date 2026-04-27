import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { subjectsTable } from "./subjects";

export const notesTable = pgTable("notes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  subjectId: integer("subject_id").references(() => subjectsTable.id, { onDelete: "set null" }),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Note = typeof notesTable.$inferSelect;
