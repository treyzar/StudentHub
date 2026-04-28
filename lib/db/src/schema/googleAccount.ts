import { pgTable, serial, text, bigint, timestamp } from "drizzle-orm/pg-core";

export const googleAccountsTable = pgTable("google_accounts", {
  id: serial("id").primaryKey(),
  googleUserId: text("google_user_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  picture: text("picture"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  scope: text("scope"),
  tokenType: text("token_type"),
  expiryDate: bigint("expiry_date", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GoogleAccount = typeof googleAccountsTable.$inferSelect;
