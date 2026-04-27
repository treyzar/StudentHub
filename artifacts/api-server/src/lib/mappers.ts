import type {
  Subject,
  Lesson,
  Task,
  Debt,
  Grade,
  Test,
  Note,
  WeeklyPlan,
} from "@workspace/db";

export const mapSubject = (s: Subject) => ({
  id: s.id,
  name: s.name,
  teacher: s.teacher,
  color: s.color,
  description: s.description,
  archived: s.archived,
  createdAt: s.createdAt.toISOString(),
});

type SubjectRef = Pick<Subject, "id" | "name" | "color"> | null | undefined;

export const mapLesson = (l: Lesson, subject?: SubjectRef) => ({
  id: l.id,
  subjectId: l.subjectId,
  subjectName: subject?.name ?? null,
  subjectColor: subject?.color ?? null,
  title: l.title,
  startsAt: l.startsAt.toISOString(),
  endsAt: l.endsAt.toISOString(),
  location: l.location,
  teacher: l.teacher,
  source: l.source,
  description: l.description,
});

export const mapTask = (t: Task, subject?: SubjectRef) => ({
  id: t.id,
  title: t.title,
  description: t.description,
  subjectId: t.subjectId,
  subjectName: subject?.name ?? null,
  subjectColor: subject?.color ?? null,
  status: t.status,
  priority: t.priority,
  dueDate: t.dueDate ? t.dueDate.toISOString() : null,
  estimatedMinutes: t.estimatedMinutes,
  completedAt: t.completedAt ? t.completedAt.toISOString() : null,
  createdAt: t.createdAt.toISOString(),
});

export const mapDebt = (d: Debt, subject?: SubjectRef) => ({
  id: d.id,
  subjectId: d.subjectId,
  subjectName: subject?.name ?? null,
  subjectColor: subject?.color ?? null,
  title: d.title,
  description: d.description,
  appearedAt: d.appearedAt.toISOString(),
  deadline: d.deadline ? d.deadline.toISOString() : null,
  status: d.status,
  importance: d.importance,
  link: d.link,
  comment: d.comment,
});

export const mapGrade = (g: Grade, subject?: SubjectRef) => ({
  id: g.id,
  subjectId: g.subjectId,
  subjectName: subject?.name ?? null,
  subjectColor: subject?.color ?? null,
  value: g.value,
  maxValue: g.maxValue,
  kind: g.kind,
  receivedAt: g.receivedAt,
  weight: g.weight,
  comment: g.comment,
});

export const mapTest = (t: Test, subject?: SubjectRef) => ({
  id: t.id,
  subjectId: t.subjectId,
  subjectName: subject?.name ?? null,
  subjectColor: subject?.color ?? null,
  title: t.title,
  scheduledAt: t.scheduledAt.toISOString(),
  deadline: t.deadline ? t.deadline.toISOString() : null,
  status: t.status,
  result: t.result,
  link: t.link,
  importance: t.importance,
  needsPreparation: t.needsPreparation,
  preparationPlan: t.preparationPlan,
});

export const mapNote = (n: Note, subject?: SubjectRef) => ({
  id: n.id,
  title: n.title,
  content: n.content,
  subjectId: n.subjectId,
  subjectName: subject?.name ?? null,
  subjectColor: subject?.color ?? null,
  tags: n.tags,
  createdAt: n.createdAt.toISOString(),
  updatedAt: n.updatedAt.toISOString(),
});

export const mapWeeklyPlan = (w: WeeklyPlan) => ({
  id: w.id,
  weekStartDate: w.weekStartDate,
  goals: w.goals,
  notes: w.notes,
  status: w.status,
  updatedAt: w.updatedAt.toISOString(),
});
