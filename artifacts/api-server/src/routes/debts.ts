import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, debtsTable } from "@workspace/db";
import {
  CreateDebtBody,
  UpdateDebtBody,
  UpdateDebtParams,
  DeleteDebtParams,
  ListDebtsQueryParams,
} from "@workspace/api-zod";
import { mapDebt } from "../lib/mappers";
import { loadSubjectsByIds } from "../lib/subjectLookup";

const router: IRouter = Router();

router.get("/debts", async (req, res): Promise<void> => {
  const q = ListDebtsQueryParams.safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: q.error.message }); return; }

  const conditions = [];
  if (q.data.subjectId !== undefined) conditions.push(eq(debtsTable.subjectId, q.data.subjectId));
  if (q.data.status) conditions.push(eq(debtsTable.status, q.data.status));

  const rows = await db.select().from(debtsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(debtsTable.deadline));

  const subjects = await loadSubjectsByIds(rows.map((r) => r.subjectId));
  res.json(rows.map((d) => mapDebt(d, d.subjectId ? subjects.get(d.subjectId) : null)));
});

router.post("/debts", async (req, res): Promise<void> => {
  const parsed = CreateDebtBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(debtsTable).values({
    subjectId: parsed.data.subjectId ?? null,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
    status: parsed.data.status ?? "open",
    importance: parsed.data.importance ?? "medium",
    link: parsed.data.link ?? null,
    comment: parsed.data.comment ?? null,
  }).returning();
  const subjects = await loadSubjectsByIds([row.subjectId]);
  res.status(201).json(mapDebt(row, row.subjectId ? subjects.get(row.subjectId) : null));
});

router.patch("/debts/:id", async (req, res): Promise<void> => {
  const params = UpdateDebtParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateDebtBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(debtsTable).set({
    subjectId: parsed.data.subjectId ?? null,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
    status: parsed.data.status ?? "open",
    importance: parsed.data.importance ?? "medium",
    link: parsed.data.link ?? null,
    comment: parsed.data.comment ?? null,
  }).where(eq(debtsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Debt not found" }); return; }
  const subjects = await loadSubjectsByIds([row.subjectId]);
  res.json(mapDebt(row, row.subjectId ? subjects.get(row.subjectId) : null));
});

router.delete("/debts/:id", async (req, res): Promise<void> => {
  const params = DeleteDebtParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.delete(debtsTable).where(eq(debtsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Debt not found" }); return; }
  res.sendStatus(204);
});

export default router;
