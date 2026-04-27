import { pgTable, serial, text, integer, real, date, timestamp } from "drizzle-orm/pg-core";
import { subjectsTable } from "./subjects";

export const gradesTable = pgTable("grades", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjectsTable.id, { onDelete: "set null" }),
  value: real("value").notNull(),
  maxValue: real("max_value").notNull().default(5),
  kind: text("kind").notNull().default("other"),
  receivedAt: date("received_at").notNull(),
  weight: real("weight").notNull().default(1),
  comment: text("comment"),
  source: text("source").notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Grade = typeof gradesTable.$inferSelect;
