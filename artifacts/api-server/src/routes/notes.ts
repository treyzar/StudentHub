import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, notesTable } from "@workspace/db";
import {
  CreateNoteBody,
  UpdateNoteBody,
  UpdateNoteParams,
  DeleteNoteParams,
  ListNotesQueryParams,
} from "@workspace/api-zod";
import { mapNote } from "../lib/mappers";
import { loadSubjectsByIds } from "../lib/subjectLookup";

const router: IRouter = Router();

router.get("/notes", async (req, res): Promise<void> => {
  const q = ListNotesQueryParams.safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: q.error.message }); return; }

  const conditions = [];
  if (q.data.subjectId !== undefined) conditions.push(eq(notesTable.subjectId, q.data.subjectId));

  const rows = await db.select().from(notesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(notesTable.updatedAt));

  const subjects = await loadSubjectsByIds(rows.map((r) => r.subjectId));
  res.json(rows.map((n) => mapNote(n, n.subjectId ? subjects.get(n.subjectId) : null)));
});

router.post("/notes", async (req, res): Promise<void> => {
  const parsed = CreateNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(notesTable).values({
    title: parsed.data.title,
    content: parsed.data.content,
    subjectId: parsed.data.subjectId ?? null,
    tags: parsed.data.tags ?? [],
  }).returning();
  const subjects = await loadSubjectsByIds([row.subjectId]);
  res.status(201).json(mapNote(row, row.subjectId ? subjects.get(row.subjectId) : null));
});

router.patch("/notes/:id", async (req, res): Promise<void> => {
  const params = UpdateNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(notesTable).set({
    title: parsed.data.title,
    content: parsed.data.content,
    subjectId: parsed.data.subjectId ?? null,
    tags: parsed.data.tags ?? [],
  }).where(eq(notesTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Note not found" }); return; }
  const subjects = await loadSubjectsByIds([row.subjectId]);
  res.json(mapNote(row, row.subjectId ? subjects.get(row.subjectId) : null));
});

router.delete("/notes/:id", async (req, res): Promise<void> => {
  const params = DeleteNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db.delete(notesTable).where(eq(notesTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Note not found" }); return; }
  res.sendStatus(204);
});

export default router;
