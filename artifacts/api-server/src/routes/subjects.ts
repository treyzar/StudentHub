import { Router, type IRouter } from "express";
import { eq, sql, and, gte, asc, count } from "drizzle-orm";
import {
  db,
  subjectsTable,
  gradesTable,
  debtsTable,
  tasksTable,
  testsTable,
  lessonsTable,
  notesTable,
} from "@workspace/db";
import {
  CreateSubjectBody,
  UpdateSubjectBody,
  GetSubjectParams,
  UpdateSubjectParams,
  DeleteSubjectParams,
} from "@workspace/api-zod";
import { mapSubject, mapLesson, mapGrade, mapDebt, mapTest, mapTask, mapNote } from "../lib/mappers";

const router: IRouter = Router();

router.get("/subjects", async (_req, res): Promise<void> => {
  const subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.name);

  // aggregates
  const debtAgg = await db
    .select({
      subjectId: debtsTable.subjectId,
      cnt: count(),
    })
    .from(debtsTable)
    .where(sql`${debtsTable.status} != 'closed'`)
    .groupBy(debtsTable.subjectId);

  const taskAgg = await db
    .select({ subjectId: tasksTable.subjectId, cnt: count() })
    .from(tasksTable)
    .where(sql`${tasksTable.status} not in ('done','skipped')`)
    .groupBy(tasksTable.subjectId);

  const now = new Date();
  const testAgg = await db
    .select({ subjectId: testsTable.subjectId, cnt: count() })
    .from(testsTable)
    .where(and(eq(testsTable.status, "upcoming"), gte(testsTable.scheduledAt, now)))
    .groupBy(testsTable.subjectId);

  const gradeAgg = await db
    .select({
      subjectId: gradesTable.subjectId,
      avg: sql<number>`avg(${gradesTable.value} / ${gradesTable.maxValue} * 5)::float`,
    })
    .from(gradesTable)
    .groupBy(gradesTable.subjectId);

  const nextLessons = await db
    .select({ subjectId: lessonsTable.subjectId, startsAt: sql<Date>`min(${lessonsTable.startsAt})` })
    .from(lessonsTable)
    .where(gte(lessonsTable.startsAt, now))
    .groupBy(lessonsTable.subjectId);

  const debtMap = new Map(debtAgg.map((r) => [r.subjectId, r.cnt]));
  const taskMap = new Map(taskAgg.map((r) => [r.subjectId, r.cnt]));
  const testMap = new Map(testAgg.map((r) => [r.subjectId, r.cnt]));
  const gradeMap = new Map(gradeAgg.map((r) => [r.subjectId, r.avg]));
  const nextMap = new Map(nextLessons.map((r) => [r.subjectId, r.startsAt]));

  const result = subjects.map((s) => ({
    id: s.id,
    name: s.name,
    teacher: s.teacher,
    color: s.color,
    description: s.description,
    archived: s.archived,
    averageGrade: gradeMap.get(s.id) ?? null,
    debtCount: debtMap.get(s.id) ?? 0,
    taskCount: taskMap.get(s.id) ?? 0,
    upcomingTestCount: testMap.get(s.id) ?? 0,
    nextLesson: nextMap.get(s.id) ? new Date(nextMap.get(s.id)!).toISOString() : null,
  }));

  res.json(result);
});

router.post("/subjects", async (req, res): Promise<void> => {
  const parsed = CreateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(subjectsTable).values({
    name: parsed.data.name,
    teacher: parsed.data.teacher ?? null,
    color: parsed.data.color,
    description: parsed.data.description ?? null,
    archived: parsed.data.archived ?? false,
  }).returning();
  res.status(201).json(mapSubject(row));
});

router.get("/subjects/:id", async (req, res): Promise<void> => {
  const params = GetSubjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, params.data.id));
  if (!subject) { res.status(404).json({ error: "Subject not found" }); return; }

  const subjectRef = { id: subject.id, name: subject.name, color: subject.color };

  const [lessons, grades, debts, tests, tasks, notes] = await Promise.all([
    db.select().from(lessonsTable).where(eq(lessonsTable.subjectId, subject.id)).orderBy(asc(lessonsTable.startsAt)),
    db.select().from(gradesTable).where(eq(gradesTable.subjectId, subject.id)).orderBy(asc(gradesTable.receivedAt)),
    db.select().from(debtsTable).where(eq(debtsTable.subjectId, subject.id)),
    db.select().from(testsTable).where(eq(testsTable.subjectId, subject.id)).orderBy(asc(testsTable.scheduledAt)),
    db.select().from(tasksTable).where(eq(tasksTable.subjectId, subject.id)),
    db.select().from(notesTable).where(eq(notesTable.subjectId, subject.id)),
  ]);

  const avgRow = await db
    .select({ avg: sql<number>`avg(${gradesTable.value} / ${gradesTable.maxValue} * 5)::float` })
    .from(gradesTable)
    .where(eq(gradesTable.subjectId, subject.id));
  const averageGrade = avgRow[0]?.avg ?? null;

  res.json({
    subject: mapSubject(subject),
    averageGrade,
    lessons: lessons.map((l) => mapLesson(l, subjectRef)),
    grades: grades.map((g) => mapGrade(g, subjectRef)),
    debts: debts.map((d) => mapDebt(d, subjectRef)),
    tests: tests.map((t) => mapTest(t, subjectRef)),
    tasks: tasks.map((t) => mapTask(t, subjectRef)),
    notes: notes.map((n) => mapNote(n, subjectRef)),
  });
});

router.patch("/subjects/:id", async (req, res): Promise<void> => {
  const params = UpdateSubjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateSubjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(subjectsTable).set({
    name: parsed.data.name,
    teacher: parsed.data.teacher ?? null,
    color: parsed.data.color,
    description: parsed.data.description ?? null,
    archived: parsed.data.archived ?? false,
  }).where(eq(subjectsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Subject not found" }); return; }
  res.json(mapSubject(row));
});

router.delete("/subjects/:id", async (req, res): Promise<void> => {
  const params = DeleteSubjectParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.delete(subjectsTable).where(eq(subjectsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Subject not found" }); return; }
  res.sendStatus(204);
});

export default router;
