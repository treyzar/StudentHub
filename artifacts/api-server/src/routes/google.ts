import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { google } from "googleapis";
import { and, eq } from "drizzle-orm";
import { db, lessonsTable } from "@workspace/db";
import {
  buildAuthUrl,
  buildOAuthClient,
  deleteStoredAccount,
  getAuthorizedClient,
  getStoredAccount,
  upsertAccount,
} from "../lib/google";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const STATE_COOKIE = "google_oauth_state";
const RETURN_COOKIE = "google_oauth_return";

function isConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

router.get("/google/status", async (_req, res): Promise<void> => {
  if (!isConfigured()) {
    res.json({
      configured: false,
      connected: false,
      account: null,
    });
    return;
  }
  const account = await getStoredAccount();
  res.json({
    configured: true,
    connected: Boolean(account),
    account: account
      ? {
          email: account.email,
          name: account.name,
          picture: account.picture,
          connectedAt: account.createdAt.toISOString(),
        }
      : null,
  });
});

router.get("/google/auth", (req, res): void => {
  if (!isConfigured()) {
    res.status(400).json({
      error: "Google OAuth не настроен. Задайте GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET.",
    });
    return;
  }
  const state = crypto.randomBytes(24).toString("hex");
  const returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : "/settings";

  const isHttps =
    req.secure ||
    req.get("x-forwarded-proto") === "https" ||
    Boolean(process.env.REPLIT_DEV_DOMAIN);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isHttps,
    maxAge: 10 * 60 * 1000,
    path: "/",
  };
  res.cookie(STATE_COOKIE, state, cookieOptions);
  res.cookie(RETURN_COOKIE, returnTo, cookieOptions);

  try {
    const url = buildAuthUrl(state);
    res.redirect(url);
  } catch (err) {
    logger.error({ err }, "Failed to build Google OAuth URL");
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/google/callback", async (req, res): Promise<void> => {
  const { code, state, error: errorParam } = req.query as Record<string, string | undefined>;
  const cookies = req.cookies as Record<string, string | undefined>;
  const expectedState = cookies[STATE_COOKIE];
  const returnTo = cookies[RETURN_COOKIE] || "/settings";

  res.clearCookie(STATE_COOKIE, { path: "/" });
  res.clearCookie(RETURN_COOKIE, { path: "/" });

  if (errorParam) {
    res.redirect(`${returnTo}?google=error&reason=${encodeURIComponent(errorParam)}`);
    return;
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    res.redirect(`${returnTo}?google=error&reason=state`);
    return;
  }

  try {
    const client = buildOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const profile = await oauth2.userinfo.get();
    const data = profile.data;

    if (!data.id || !data.email) {
      res.redirect(`${returnTo}?google=error&reason=profile`);
      return;
    }

    await upsertAccount({
      googleUserId: data.id,
      email: data.email,
      name: data.name ?? null,
      picture: data.picture ?? null,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? null,
      scope: tokens.scope ?? null,
      tokenType: tokens.token_type ?? null,
      expiryDate: tokens.expiry_date ?? null,
    });

    res.redirect(`${returnTo}?google=ok`);
  } catch (err) {
    logger.error({ err }, "Google OAuth callback failed");
    res.redirect(`${returnTo}?google=error&reason=exchange`);
  }
});

router.post("/google/disconnect", async (_req, res): Promise<void> => {
  await deleteStoredAccount();
  res.json({ ok: true });
});

router.get("/google/calendar/upcoming", async (_req, res): Promise<void> => {
  const client = await getAuthorizedClient();
  if (!client) {
    res.status(401).json({ error: "Google не подключён" });
    return;
  }
  try {
    const calendar = google.calendar({ version: "v3", auth: client });
    const now = new Date();
    const inFuture = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14);
    const result = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: inFuture.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 20,
    });

    const items = (result.data.items ?? []).map((e) => ({
      id: e.id,
      summary: e.summary ?? "(без названия)",
      description: e.description ?? null,
      location: e.location ?? null,
      htmlLink: e.htmlLink ?? null,
      start: e.start?.dateTime ?? e.start?.date ?? null,
      end: e.end?.dateTime ?? e.end?.date ?? null,
      allDay: Boolean(e.start?.date && !e.start?.dateTime),
    }));
    res.json({ events: items });
  } catch (err) {
    logger.error({ err }, "Failed to fetch calendar events");
    res.status(500).json({ error: "Не удалось получить события календаря" });
  }
});

router.post("/google/calendar/import", async (req, res): Promise<void> => {
  const client = await getAuthorizedClient();
  if (!client) {
    res.status(401).json({ error: "Google не подключён" });
    return;
  }

  const daysBackRaw = req.body?.daysBack;
  const daysAheadRaw = req.body?.daysAhead;
  const daysBack =
    typeof daysBackRaw === "number" && daysBackRaw >= 0 && daysBackRaw <= 365
      ? Math.floor(daysBackRaw)
      : 30;
  const daysAhead =
    typeof daysAheadRaw === "number" && daysAheadRaw >= 0 && daysAheadRaw <= 365
      ? Math.floor(daysAheadRaw)
      : 90;

  try {
    const calendar = google.calendar({ version: "v3", auth: client });
    const now = new Date();
    const timeMin = new Date(now.getTime() - daysBack * 86400000);
    const timeMax = new Date(now.getTime() + daysAhead * 86400000);

    const events: Array<{
      id: string;
      summary: string;
      description: string | null;
      location: string | null;
      start: string;
      end: string;
    }> = [];
    let skipped = 0;
    let pageToken: string | undefined = undefined;
    let safety = 0;
    while (safety < 20) {
      safety += 1;
      const result = await calendar.events.list({
        calendarId: "primary",
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 250,
        ...(pageToken ? { pageToken } : {}),
      });
      for (const e of result.data.items ?? []) {
        const startIso = e.start?.dateTime;
        const endIso = e.end?.dateTime;
        if (!e.id || !startIso || !endIso) {
          if (e.id) skipped += 1;
          continue;
        }
        events.push({
          id: e.id,
          summary: e.summary ?? "(без названия)",
          description: e.description ?? null,
          location: e.location ?? null,
          start: startIso,
          end: endIso,
        });
      }
      pageToken = result.data.nextPageToken ?? undefined;
      if (!pageToken) break;
    }

    let created = 0;
    let updated = 0;
    for (const ev of events) {
      const existing = await db
        .select({ id: lessonsTable.id })
        .from(lessonsTable)
        .where(
          and(
            eq(lessonsTable.source, "google"),
            eq(lessonsTable.externalId, ev.id),
          ),
        )
        .limit(1);

      const values = {
        title: ev.summary,
        startsAt: new Date(ev.start),
        endsAt: new Date(ev.end),
        location: ev.location,
        description: ev.description,
      };

      if (existing[0]) {
        await db
          .update(lessonsTable)
          .set(values)
          .where(eq(lessonsTable.id, existing[0].id));
        updated += 1;
      } else {
        await db.insert(lessonsTable).values({
          ...values,
          source: "google",
          externalId: ev.id,
          subjectId: null,
          teacher: null,
        });
        created += 1;
      }
    }

    res.json({
      ok: true,
      total: events.length,
      created,
      updated,
      skipped,
      rangeFrom: timeMin.toISOString(),
      rangeTo: timeMax.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Failed to import calendar events");
    res
      .status(500)
      .json({ error: "Не удалось импортировать события календаря" });
  }
});

const SCHEDULE_SHEET_ID = "1lkHJsU31BtzsaIZ9Vn6V9LkffVMc2L53OeneOabh5K0";
const SCHEDULE_SHEET_GID = 785294066;

router.get("/google/schedule-sheet", async (_req, res): Promise<void> => {
  const client = await getAuthorizedClient();
  if (!client) {
    res.status(401).json({ error: "Google не подключён" });
    return;
  }
  try {
    const sheets = google.sheets({ version: "v4", auth: client });

    const meta = await sheets.spreadsheets.get({
      spreadsheetId: SCHEDULE_SHEET_ID,
      includeGridData: false,
    });
    const sheet = (meta.data.sheets ?? []).find(
      (s) => s.properties?.sheetId === SCHEDULE_SHEET_GID,
    );
    if (!sheet?.properties?.title) {
      res.status(404).json({ error: "Лист с расписанием не найден" });
      return;
    }
    const sheetTitle = sheet.properties.title;

    const valuesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SCHEDULE_SHEET_ID,
      range: `'${sheetTitle.replace(/'/g, "''")}'`,
      valueRenderOption: "FORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });

    const rows = (valuesRes.data.values ?? []).map((row) =>
      row.map((cell) => (cell == null ? "" : String(cell))),
    );

    res.json({
      spreadsheetId: SCHEDULE_SHEET_ID,
      sheetTitle,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${SCHEDULE_SHEET_ID}/edit?gid=${SCHEDULE_SHEET_GID}`,
      title: meta.data.properties?.title ?? null,
      rows,
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch schedule sheet");
    const message = err instanceof Error ? err.message : "unknown error";
    if (/permission|403/i.test(message)) {
      res.status(403).json({
        error:
          "Нет доступа к таблице. Откройте доступ для подключённого Google аккаунта.",
      });
      return;
    }
    res.status(500).json({ error: "Не удалось загрузить таблицу расписания" });
  }
});

router.get("/google/sheets/list", async (_req, res): Promise<void> => {
  const client = await getAuthorizedClient();
  if (!client) {
    res.status(401).json({ error: "Google не подключён" });
    return;
  }
  try {
    const drive = google.drive({ version: "v3", auth: client });
    const result = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      pageSize: 20,
      fields: "files(id, name, modifiedTime, webViewLink, owners(displayName))",
      orderBy: "modifiedTime desc",
    });
    const items = (result.data.files ?? []).map((f) => ({
      id: f.id!,
      name: f.name ?? "(без названия)",
      modifiedTime: f.modifiedTime ?? null,
      webViewLink: f.webViewLink ?? null,
      owner: f.owners?.[0]?.displayName ?? null,
    }));
    res.json({ spreadsheets: items });
  } catch (err) {
    logger.error({ err }, "Failed to fetch spreadsheets");
    res.status(500).json({ error: "Не удалось получить таблицы" });
  }
});

export default router;
