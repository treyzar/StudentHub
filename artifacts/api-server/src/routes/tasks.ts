import { Router, type IRouter } from "express";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
import {
  CreateTaskBody,
  UpdateTaskBody,
  UpdateTaskParams,
  DeleteTaskParams,
  ListTasksQueryParams,
} from "@workspace/api-zod";
import { mapTask } from "../lib/mappers";
import { loadSubjectsByIds } from "../lib/subjectLookup";

const router: IRouter = Router();

router.get("/tasks", async (req, res): Promise<void> => {
  const q = ListTasksQueryParams.safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: q.error.message }); return; }

  const conditions = [];
  if (q.data.subjectId !== undefined) conditions.push(eq(tasksTable.subjectId, q.data.subjectId));
  if (q.data.status) conditions.push(eq(tasksTable.status, q.data.status));
  if (q.data.dueDate) {
    const day = new Date(q.data.dueDate);
    const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
    conditions.push(gte(tasksTable.dueDate, day));
    conditions.push(lte(tasksTable.dueDate, nextDay));
  }

  const rows = await db.select().from(tasksTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(tasksTable.dueDate), asc(tasksTable.createdAt));

  const subjects = await loadSubjectsByIds(rows.map((r) => r.subjectId));
  res.json(rows.map((t) => mapTask(t, t.subjectId ? subjects.get(t.subjectId) : null)));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const status = parsed.data.status ?? "todo";
  const [row] = await db.insert(tasksTable).values({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    subjectId: parsed.data.subjectId ?? null,
    status,
    priority: parsed.data.priority ?? "medium",
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    estimatedMinutes: parsed.data.estimatedMinutes ?? null,
    completedAt: status === "done" ? new Date() : null,
  }).returning();
  const subjects = await loadSubjectsByIds([row.subjectId]);
  res.status(201).json(mapTask(row, row.subjectId ? subjects.get(row.subjectId) : null));
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Task not found" }); return; }

  const newStatus = parsed.data.status ?? existing.status;
  const completedAt = newStatus === "done"
    ? (existing.completedAt ?? new Date())
    : null;

  const [row] = await db.update(tasksTable).set({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    subjectId: parsed.data.subjectId ?? null,
    status: newStatus,
    priority: parsed.data.priority ?? "medium",
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    estimatedMinutes: parsed.data.estimatedMinutes ?? null,
    completedAt,
  }).where(eq(tasksTable.id, params.data.id)).returning();

  const subjects = await loadSubjectsByIds([row.subjectId]);
  res.json(mapTask(row, row.subjectId ? subjects.get(row.subjectId) : null));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Task not found" }); return; }
  res.sendStatus(204);
});

export default router;
