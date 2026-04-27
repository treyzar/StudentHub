import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { subjectsTable } from "./subjects";

export const testsTable = pgTable("tests", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjectsTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  deadline: timestamp("deadline", { withTimezone: true }),
  status: text("status").notNull().default("upcoming"),
  result: text("result"),
  link: text("link"),
  importance: text("importance").notNull().default("medium"),
  needsPreparation: boolean("needs_preparation").notNull().default(true),
  preparationPlan: text("preparation_plan"),
});

export type Test = typeof testsTable.$inferSelect;
