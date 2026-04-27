import { Router, type IRouter } from "express";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db, lessonsTable } from "@workspace/db";
import {
  CreateLessonBody,
  UpdateLessonBody,
  UpdateLessonParams,
  DeleteLessonParams,
  ListLessonsQueryParams,
} from "@workspace/api-zod";
import { mapLesson } from "../lib/mappers";
import { loadSubjectsByIds } from "../lib/subjectLookup";

const router: IRouter = Router();

router.get("/lessons", async (req, res): Promise<void> => {
  const q = ListLessonsQueryParams.safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: q.error.message }); return; }

  const conditions = [];
  if (q.data.subjectId !== undefined) conditions.push(eq(lessonsTable.subjectId, q.data.subjectId));
  if (q.data.from) conditions.push(gte(lessonsTable.startsAt, new Date(q.data.from)));
  if (q.data.to) conditions.push(lte(lessonsTable.startsAt, new Date(q.data.to)));

  const rows = await db.select().from(lessonsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(lessonsTable.startsAt));

  const subjects = await loadSubjectsByIds(rows.map((r) => r.subjectId));
  res.json(rows.map((l) => mapLesson(l, l.subjectId ? subjects.get(l.subjectId) : null)));
});

router.post("/lessons", async (req, res): Promise<void> => {
  const parsed = CreateLessonBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(lessonsTable).values({
    subjectId: parsed.data.subjectId ?? null,
    title: parsed.data.title,
    startsAt: new Date(parsed.data.startsAt),
    endsAt: new Date(parsed.data.endsAt),
    location: parsed.data.location ?? null,
    teacher: parsed.data.teacher ?? null,
    description: parsed.data.description ?? null,
  }).returning();
  const subjects = await loadSubjectsByIds([row.subjectId]);
  res.status(201).json(mapLesson(row, row.subjectId ? subjects.get(row.subjectId) : null));
});

router.patch("/lessons/:id", async (req, res): Promise<void> => {
  const params = UpdateLessonParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateLessonBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(lessonsTable).set({
    subjectId: parsed.data.subjectId ?? null,
    title: parsed.data.title,
    startsAt: new Date(parsed.data.startsAt),
    endsAt: new Date(parsed.data.endsAt),
    location: parsed.data.location ?? null,
    teacher: parsed.data.teacher ?? null,
    description: parsed.data.description ?? null,
  }).where(eq(lessonsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Lesson not found" }); return; }
  const subjects = await loadSubjectsByIds([row.subjectId]);
  res.json(mapLesson(row, row.subjectId ? subjects.get(row.subjectId) : null));
});

router.delete("/lessons/:id", async (req, res): Promise<void> => {
  const params = DeleteLessonParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.delete(lessonsTable).where(eq(lessonsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Lesson not found" }); return; }
  res.sendStatus(204);
});

export default router;
