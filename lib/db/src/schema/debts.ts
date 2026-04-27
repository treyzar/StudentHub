import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { subjectsTable } from "./subjects";

export const debtsTable = pgTable("debts", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjectsTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  appearedAt: timestamp("appeared_at", { withTimezone: true }).notNull().defaultNow(),
  deadline: timestamp("deadline", { withTimezone: true }),
  status: text("status").notNull().default("open"),
  importance: text("importance").notNull().default("medium"),
  link: text("link"),
  comment: text("comment"),
});

export type Debt = typeof debtsTable.$inferSelect;
