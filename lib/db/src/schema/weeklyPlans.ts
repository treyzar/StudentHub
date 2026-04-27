import { pgTable, serial, text, date, timestamp } from "drizzle-orm/pg-core";

export const weeklyPlansTable = pgTable("weekly_plans", {
  id: serial("id").primaryKey(),
  weekStartDate: date("week_start_date").notNull().unique(),
  goals: text("goals").notNull().default(""),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("active"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type WeeklyPlan = typeof weeklyPlansTable.$inferSelect;
