import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { subjectsTable } from "./subjects";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id").references(() => subjectsTable.id, { onDelete: "set null" }),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("medium"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  estimatedMinutes: integer("estimated_minutes"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  source: text("source").notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Task = typeof tasksTable.$inferSelect;
