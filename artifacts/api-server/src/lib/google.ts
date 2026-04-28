import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { db, googleAccountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.readonly",
];

export function getRequiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export function getClientId(): string {
  return getRequiredEnv("GOOGLE_CLIENT_ID");
}

export function getClientSecret(): string {
  return getRequiredEnv("GOOGLE_CLIENT_SECRET");
}

export function getRedirectUri(): string {
  const explicit = process.env.GOOGLE_REDIRECT_URI;
  if (explicit) return explicit;
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS;
  if (domain) {
    return `https://${domain.split(",")[0].trim()}/api/google/callback`;
  }
  const port = process.env.PORT || "8080";
  return `http://localhost:${port}/api/google/callback`;
}

export function buildOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(getClientId(), getClientSecret(), getRedirectUri());
}

export function buildAuthUrl(state: string): string {
  const client = buildOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: SCOPES,
    state,
  });
}

export async function getStoredAccount() {
  const rows = await db.select().from(googleAccountsTable).limit(1);
  return rows[0] ?? null;
}

export async function deleteStoredAccount() {
  await db.delete(googleAccountsTable);
}

export async function upsertAccount(input: {
  googleUserId: string;
  email: string;
  name: string | null;
  picture: string | null;
  accessToken: string;
  refreshToken: string | null;
  scope: string | null;
  tokenType: string | null;
  expiryDate: number | null;
}) {
  const existing = await getStoredAccount();
  if (existing) {
    await db
      .update(googleAccountsTable)
      .set({
        googleUserId: input.googleUserId,
        email: input.email,
        name: input.name,
        picture: input.picture,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken ?? existing.refreshToken,
        scope: input.scope,
        tokenType: input.tokenType,
        expiryDate: input.expiryDate,
        updatedAt: new Date(),
      })
      .where(eq(googleAccountsTable.id, existing.id));
  } else {
    await db.insert(googleAccountsTable).values({
      googleUserId: input.googleUserId,
      email: input.email,
      name: input.name,
      picture: input.picture,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      scope: input.scope,
      tokenType: input.tokenType,
      expiryDate: input.expiryDate,
    });
  }
}

export async function getAuthorizedClient(): Promise<OAuth2Client | null> {
  const account = await getStoredAccount();
  if (!account) return null;

  const client = buildOAuthClient();
  client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken ?? undefined,
    scope: account.scope ?? undefined,
    token_type: account.tokenType ?? undefined,
    expiry_date: account.expiryDate ?? undefined,
  });

  client.on("tokens", (tokens) => {
    void (async () => {
      const current = await getStoredAccount();
      if (!current) return;
      await db
        .update(googleAccountsTable)
        .set({
          accessToken: tokens.access_token ?? current.accessToken,
          refreshToken: tokens.refresh_token ?? current.refreshToken,
          scope: tokens.scope ?? current.scope,
          tokenType: tokens.token_type ?? current.tokenType,
          expiryDate: tokens.expiry_date ?? current.expiryDate,
          updatedAt: new Date(),
        })
        .where(eq(googleAccountsTable.id, current.id));
    })();
  });

  return client;
}

export { SCOPES };
