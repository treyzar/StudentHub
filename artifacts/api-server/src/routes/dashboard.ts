import { Router, type IRouter } from "express";
import { and, asc, eq, gte, lte, sql, isNotNull, ne } from "drizzle-orm";
import {
  db,
  lessonsTable,
  tasksTable,
  debtsTable,
  testsTable,
  gradesTable,
} from "@workspace/db";
import {
  mapLesson,
  mapTask,
  mapDebt,
  mapTest,
} from "../lib/mappers";
import { loadSubjectsByIds } from "../lib/subjectLookup";

const router: IRouter = Router();

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = (day + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}

function freeSlots(date: Date, lessonsForDay: { startsAt: Date; endsAt: Date }[]) {
  const dayStart = new Date(date); dayStart.setHours(8, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(22, 0, 0, 0);
  const sorted = [...lessonsForDay].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const slots: { startsAt: Date; endsAt: Date }[] = [];
  let cursor = dayStart;
  for (const ev of sorted) {
    if (ev.startsAt > cursor) {
      const end = ev.startsAt > dayEnd ? dayEnd : ev.startsAt;
      if (end > cursor) slots.push({ startsAt: cursor, endsAt: end });
    }
    if (ev.endsAt > cursor) cursor = ev.endsAt;
  }
  if (cursor < dayEnd) slots.push({ startsAt: cursor, endsAt: dayEnd });

  return slots
    .map((s) => ({
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      durationMinutes: Math.round((s.endsAt.getTime() - s.startsAt.getTime()) / 60000),
    }))
    .filter((s) => s.durationMinutes >= 30);
}

router.get("/dashboard/today", async (_req, res): Promise<void> => {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const in7days = new Date(now.getTime() + 7 * DAY_MS);

  const [lessons, tasks, debts, upcomingTests] = await Promise.all([
    db.select().from(lessonsTable)
      .where(and(gte(lessonsTable.startsAt, dayStart), lte(lessonsTable.startsAt, dayEnd)))
      .orderBy(asc(lessonsTable.startsAt)),
    db.select().from(tasksTable)
      .where(and(
        ne(tasksTable.status, "skipped"),
        isNotNull(tasksTable.dueDate),
        gte(tasksTable.dueDate, dayStart),
        lte(tasksTable.dueDate, dayEnd),
      ))
      .orderBy(asc(tasksTable.dueDate)),
    db.select().from(debtsTable)
      .where(ne(debtsTable.status, "closed"))
      .orderBy(asc(debtsTable.deadline)),
    db.select().from(testsTable)
      .where(and(eq(testsTable.status, "upcoming"), gte(testsTable.scheduledAt, now), lte(testsTable.scheduledAt, in7days)))
      .orderBy(asc(testsTable.scheduledAt)),
  ]);

  const subjectIds = [
    ...lessons.map((l) => l.subjectId),
    ...tasks.map((t) => t.subjectId),
    ...debts.map((d) => d.subjectId),
    ...upcomingTests.map((t) => t.subjectId),
  ];
  const subjects = await loadSubjectsByIds(subjectIds);

  const slots = freeSlots(now, lessons);

  // stats
  const [
    [{ tasksToday }],
    [{ tasksDoneToday }],
    [{ tasksTotal }],
    [{ tasksDoneTotal }],
    [{ openDebts }],
    [{ upcomingTests7d }],
    [avgRow],
  ] = await Promise.all([
    db.select({ tasksToday: sql<number>`count(*)::int` }).from(tasksTable)
      .where(and(gte(tasksTable.dueDate, dayStart), lte(tasksTable.dueDate, dayEnd))),
    db.select({ tasksDoneToday: sql<number>`count(*)::int` }).from(tasksTable)
      .where(and(eq(tasksTable.status, "done"), gte(tasksTable.completedAt, dayStart), lte(tasksTable.completedAt, dayEnd))),
    db.select({ tasksTotal: sql<number>`count(*)::int` }).from(tasksTable),
    db.select({ tasksDoneTotal: sql<number>`count(*)::int` }).from(tasksTable).where(eq(tasksTable.status, "done")),
    db.select({ openDebts: sql<number>`count(*)::int` }).from(debtsTable).where(ne(debtsTable.status, "closed")),
    db.select({ upcomingTests7d: sql<number>`count(*)::int` }).from(testsTable)
      .where(and(eq(testsTable.status, "upcoming"), gte(testsTable.scheduledAt, now), lte(testsTable.scheduledAt, in7days))),
    db.select({ avg: sql<number>`avg(${gradesTable.value} / ${gradesTable.maxValue} * 5)::float` }).from(gradesTable),
  ]);

  const stats = {
    tasksToday,
    tasksDoneToday,
    tasksTotal,
    tasksDoneTotal,
    openDebts,
    upcomingTests7d,
    lessonsToday: lessons.length,
    averageGrade: avgRow?.avg ?? null,
  };

  res.json({
    date: dayStart.toISOString().slice(0, 10),
    lessons: lessons.map((l) => mapLesson(l, l.subjectId ? subjects.get(l.subjectId) : null)),
    tasks: tasks.map((t) => mapTask(t, t.subjectId ? subjects.get(t.subjectId) : null)),
    debts: debts.map((d) => mapDebt(d, d.subjectId ? subjects.get(d.subjectId) : null)),
    upcomingTests: upcomingTests.map((t) => mapTest(t, t.subjectId ? subjects.get(t.subjectId) : null)),
    freeSlots: slots,
    stats,
  });
});

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const in7days = new Date(now.getTime() + 7 * DAY_MS);

  const [
    [{ tasksToday }],
    [{ tasksDoneToday }],
    [{ tasksTotal }],
    [{ tasksDoneTotal }],
    [{ openDebts }],
    [{ upcomingTests7d }],
    [{ lessonsToday }],
    [avgRow],
  ] = await Promise.all([
    db.select({ tasksToday: sql<number>`count(*)::int` }).from(tasksTable)
      .where(and(gte(tasksTable.dueDate, dayStart), lte(tasksTable.dueDate, dayEnd))),
    db.select({ tasksDoneToday: sql<number>`count(*)::int` }).from(tasksTable)
      .where(and(eq(tasksTable.status, "done"), gte(tasksTable.completedAt, dayStart), lte(tasksTable.completedAt, dayEnd))),
    db.select({ tasksTotal: sql<number>`count(*)::int` }).from(tasksTable),
    db.select({ tasksDoneTotal: sql<number>`count(*)::int` }).from(tasksTable).where(eq(tasksTable.status, "done")),
    db.select({ openDebts: sql<number>`count(*)::int` }).from(debtsTable).where(ne(debtsTable.status, "closed")),
    db.select({ upcomingTests7d: sql<number>`count(*)::int` }).from(testsTable)
      .where(and(eq(testsTable.status, "upcoming"), gte(testsTable.scheduledAt, now), lte(testsTable.scheduledAt, in7days))),
    db.select({ lessonsToday: sql<number>`count(*)::int` }).from(lessonsTable)
      .where(and(gte(lessonsTable.startsAt, dayStart), lte(lessonsTable.startsAt, dayEnd))),
    db.select({ avg: sql<number>`avg(${gradesTable.value} / ${gradesTable.maxValue} * 5)::float` }).from(gradesTable),
  ]);

  res.json({
    tasksToday,
    tasksDoneToday,
    tasksTotal,
    tasksDoneTotal,
    openDebts,
    upcomingTests7d,
    lessonsToday,
    averageGrade: avgRow?.avg ?? null,
  });
});

router.get("/dashboard/upcoming-deadlines", async (_req, res): Promise<void> => {
  const now = new Date();
  const in14days = new Date(now.getTime() + 14 * DAY_MS);

  const [tasks, debts, tests] = await Promise.all([
    db.select().from(tasksTable)
      .where(and(
        isNotNull(tasksTable.dueDate),
        gte(tasksTable.dueDate, now),
        lte(tasksTable.dueDate, in14days),
        ne(tasksTable.status, "done"),
        ne(tasksTable.status, "skipped"),
      ))
      .orderBy(asc(tasksTable.dueDate)),
    db.select().from(debtsTable)
      .where(and(
        isNotNull(debtsTable.deadline),
        gte(debtsTable.deadline, now),
        lte(debtsTable.deadline, in14days),
        ne(debtsTable.status, "closed"),
      ))
      .orderBy(asc(debtsTable.deadline)),
    db.select().from(testsTable)
      .where(and(
        eq(testsTable.status, "upcoming"),
        gte(testsTable.scheduledAt, now),
        lte(testsTable.scheduledAt, in14days),
      ))
      .orderBy(asc(testsTable.scheduledAt)),
  ]);

  const subjects = await loadSubjectsByIds([
    ...tasks.map((x) => x.subjectId),
    ...debts.map((x) => x.subjectId),
    ...tests.map((x) => x.subjectId),
  ]);

  const items = [
    ...tasks.map((t) => ({
      id: `task-${t.id}`,
      kind: "task" as const,
      title: t.title,
      subjectId: t.subjectId,
      subjectName: t.subjectId ? subjects.get(t.subjectId)?.name ?? null : null,
      subjectColor: t.subjectId ? subjects.get(t.subjectId)?.color ?? null : null,
      dueAt: t.dueDate!.toISOString(),
      importance: t.priority,
    })),
    ...debts.map((d) => ({
      id: `debt-${d.id}`,
      kind: "debt" as const,
      title: d.title,
      subjectId: d.subjectId,
      subjectName: d.subjectId ? subjects.get(d.subjectId)?.name ?? null : null,
      subjectColor: d.subjectId ? subjects.get(d.subjectId)?.color ?? null : null,
      dueAt: d.deadline!.toISOString(),
      importance: d.importance,
    })),
    ...tests.map((t) => ({
      id: `test-${t.id}`,
      kind: "test" as const,
      title: t.title,
      subjectId: t.subjectId,
      subjectName: t.subjectId ? subjects.get(t.subjectId)?.name ?? null : null,
      subjectColor: t.subjectId ? subjects.get(t.subjectId)?.color ?? null : null,
      dueAt: t.scheduledAt.toISOString(),
      importance: t.importance,
    })),
  ].sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  res.json(items);
});

router.get("/dashboard/free-slots", async (req, res): Promise<void> => {
  const dateStr = typeof req.query.date === "string" ? req.query.date : undefined;
  const date = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(date.getTime())) { res.status(400).json({ error: "Invalid date" }); return; }
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const lessons = await db.select({ startsAt: lessonsTable.startsAt, endsAt: lessonsTable.endsAt }).from(lessonsTable)
    .where(and(gte(lessonsTable.startsAt, dayStart), lte(lessonsTable.startsAt, dayEnd)));

  res.json(freeSlots(date, lessons));
});

router.get("/week", async (req, res): Promise<void> => {
  const weekStartStr = typeof req.query.weekStart === "string" ? req.query.weekStart : undefined;
  const base = weekStartStr ? new Date(weekStartStr) : new Date();
  if (Number.isNaN(base.getTime())) { res.status(400).json({ error: "Invalid weekStart" }); return; }
  const weekStart = startOfWeek(base);
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS - 1);

  const [lessons, tasks, tests, debts] = await Promise.all([
    db.select().from(lessonsTable)
      .where(and(gte(lessonsTable.startsAt, weekStart), lte(lessonsTable.startsAt, weekEnd)))
      .orderBy(asc(lessonsTable.startsAt)),
    db.select().from(tasksTable)
      .where(and(
        isNotNull(tasksTable.dueDate),
        gte(tasksTable.dueDate, weekStart),
        lte(tasksTable.dueDate, weekEnd),
      ))
      .orderBy(asc(tasksTable.dueDate)),
    db.select().from(testsTable)
      .where(and(gte(testsTable.scheduledAt, weekStart), lte(testsTable.scheduledAt, weekEnd)))
      .orderBy(asc(testsTable.scheduledAt)),
    db.select().from(debtsTable)
      .where(and(
        isNotNull(debtsTable.deadline),
        gte(debtsTable.deadline, weekStart),
        lte(debtsTable.deadline, weekEnd),
      ))
      .orderBy(asc(debtsTable.deadline)),
  ]);

  const subjectIds = [
    ...lessons.map((x) => x.subjectId),
    ...tasks.map((x) => x.subjectId),
    ...tests.map((x) => x.subjectId),
    ...debts.map((x) => x.subjectId),
  ];
  const subjects = await loadSubjectsByIds(subjectIds);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.getTime() + i * DAY_MS);
    const dStr = d.toISOString().slice(0, 10);
    const dayLessons = lessons.filter((l) => l.startsAt.toISOString().slice(0, 10) === dStr);
    const dayTasks = tasks.filter((t) => t.dueDate && t.dueDate.toISOString().slice(0, 10) === dStr);
    const dayTests = tests.filter((t) => t.scheduledAt.toISOString().slice(0, 10) === dStr);
    const dayDebts = debts.filter((x) => x.deadline && x.deadline.toISOString().slice(0, 10) === dStr);
    const loadScore = dayLessons.length * 2 + dayTasks.length + dayTests.length * 3 + dayDebts.length * 2;

    days.push({
      date: dStr,
      weekday: d.getDay(),
      lessons: dayLessons.map((l) => mapLesson(l, l.subjectId ? subjects.get(l.subjectId) : null)),
      tasks: dayTasks.map((t) => mapTask(t, t.subjectId ? subjects.get(t.subjectId) : null)),
      tests: dayTests.map((t) => mapTest(t, t.subjectId ? subjects.get(t.subjectId) : null)),
      debts: dayDebts.map((d) => mapDebt(d, d.subjectId ? subjects.get(d.subjectId) : null)),
      loadScore,
    });
  }

  res.json({
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: new Date(weekStart.getTime() + 6 * DAY_MS).toISOString().slice(0, 10),
    days,
  });
});

export default router;
