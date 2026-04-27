import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, testsTable } from "@workspace/db";
import {
  CreateTestBody,
  UpdateTestBody,
  UpdateTestParams,
  DeleteTestParams,
  ListTestsQueryParams,
} from "@workspace/api-zod";
import { mapTest } from "../lib/mappers";
import { loadSubjectsByIds } from "../lib/subjectLookup";

const router: IRouter = Router();

router.get("/tests", async (req, res): Promise<void> => {
  const q = ListTestsQueryParams.safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: q.error.message }); return; }

  const conditions = [];
  if (q.data.subjectId !== undefined) conditions.push(eq(testsTable.subjectId, q.data.subjectId));
  if (q.data.status) conditions.push(eq(testsTable.status, q.data.status));

  const rows = await db.select().from(testsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(testsTable.scheduledAt));

  const subjects = await loadSubjectsByIds(rows.map((r) => r.subjectId));
  res.json(rows.map((t) => mapTest(t, t.subjectId ? subjects.get(t.subjectId) : null)));
});

router.post("/tests", async (req, res): Promise<void> => {
  const parsed = CreateTestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(testsTable).values({
    subjectId: parsed.data.subjectId ?? null,
    title: parsed.data.title,
    scheduledAt: new Date(parsed.data.scheduledAt),
    deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
    status: parsed.data.status ?? "upcoming",
    result: parsed.data.result ?? null,
    link: parsed.data.link ?? null,
    importance: parsed.data.importance ?? "medium",
    needsPreparation: parsed.data.needsPreparation ?? true,
    preparationPlan: parsed.data.preparationPlan ?? null,
  }).returning();
  const subjects = await loadSubjectsByIds([row.subjectId]);
  res.status(201).json(mapTest(row, row.subjectId ? subjects.get(row.subjectId) : null));
});

router.patch("/tests/:id", async (req, res): Promise<void> => {
  const params = UpdateTestParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateTestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(testsTable).set({
    subjectId: parsed.data.subjectId ?? null,
    title: parsed.data.title,
    scheduledAt: new Date(parsed.data.scheduledAt),
    deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
    status: parsed.data.status ?? "upcoming",
    result: parsed.data.result ?? null,
    link: parsed.data.link ?? null,
    importance: parsed.data.importance ?? "medium",
    needsPreparation: parsed.data.needsPreparation ?? true,
    preparationPlan: parsed.data.preparationPlan ?? null,
  }).where(eq(testsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Test not found" }); return; }
  const subjects = await loadSubjectsByIds([row.subjectId]);
  res.json(mapTest(row, row.subjectId ? subjects.get(row.subjectId) : null));
});

router.delete("/tests/:id", async (req, res): Promise<void> => {
  const params = DeleteTestParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.delete(testsTable).where(eq(testsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Test not found" }); return; }
  res.sendStatus(204);
});

export default router;
