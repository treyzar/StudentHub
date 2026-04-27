import { Router, type IRouter } from "express";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, gradesTable, subjectsTable } from "@workspace/db";
import {
  CreateGradeBody,
  DeleteGradeParams,
  ListGradesQueryParams,
} from "@workspace/api-zod";
import { mapGrade } from "../lib/mappers";
import { loadSubjectsByIds } from "../lib/subjectLookup";

const router: IRouter = Router();

router.get("/grades", async (req, res): Promise<void> => {
  const q = ListGradesQueryParams.safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: q.error.message }); return; }

  const conditions = [];
  if (q.data.subjectId !== undefined) conditions.push(eq(gradesTable.subjectId, q.data.subjectId));

  const rows = await db.select().from(gradesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(gradesTable.receivedAt));

  const subjects = await loadSubjectsByIds(rows.map((r) => r.subjectId));
  res.json(rows.map((g) => mapGrade(g, g.subjectId ? subjects.get(g.subjectId) : null)));
});

router.post("/grades", async (req, res): Promise<void> => {
  const parsed = CreateGradeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(gradesTable).values({
    subjectId: parsed.data.subjectId ?? null,
    value: parsed.data.value,
    maxValue: parsed.data.maxValue,
    kind: parsed.data.kind,
    receivedAt: (parsed.data.receivedAt instanceof Date ? parsed.data.receivedAt : new Date(parsed.data.receivedAt as unknown as string)).toISOString().slice(0, 10),
    weight: parsed.data.weight ?? 1,
    comment: parsed.data.comment ?? null,
  }).returning();
  const subjects = await loadSubjectsByIds([row.subjectId]);
  res.status(201).json(mapGrade(row, row.subjectId ? subjects.get(row.subjectId) : null));
});

router.delete("/grades/:id", async (req, res): Promise<void> => {
  const params = DeleteGradeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.delete(gradesTable).where(eq(gradesTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Grade not found" }); return; }
  res.sendStatus(204);
});

router.get("/grades/summary", async (_req, res): Promise<void> => {
  const overallRow = await db
    .select({ avg: sql<number>`avg(${gradesTable.value} / ${gradesTable.maxValue} * 5)::float` })
    .from(gradesTable);
  const overallAverage = overallRow[0]?.avg ?? null;

  const perSubject = await db
    .select({
      subjectId: subjectsTable.id,
      subjectName: subjectsTable.name,
      subjectColor: subjectsTable.color,
      avg: sql<number | null>`avg(${gradesTable.value} / ${gradesTable.maxValue} * 5)::float`,
      cnt: sql<number>`count(${gradesTable.id})::int`,
    })
    .from(subjectsTable)
    .leftJoin(gradesTable, eq(gradesTable.subjectId, subjectsTable.id))
    .groupBy(subjectsTable.id, subjectsTable.name, subjectsTable.color)
    .orderBy(asc(subjectsTable.name));

  res.json({
    overallAverage,
    bySubject: perSubject.map((r) => ({
      subjectId: r.subjectId,
      subjectName: r.subjectName,
      subjectColor: r.subjectColor,
      average: r.avg,
      count: r.cnt,
    })),
  });
});

export default router;
