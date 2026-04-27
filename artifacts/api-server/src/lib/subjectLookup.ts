import { db, subjectsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

export async function loadSubjectsByIds(ids: (number | null | undefined)[]) {
  const unique = Array.from(
    new Set(ids.filter((x): x is number => typeof x === "number")),
  );
  const map = new Map<number, { id: number; name: string; color: string }>();
  if (unique.length === 0) return map;
  const rows = await db
    .select({ id: subjectsTable.id, name: subjectsTable.name, color: subjectsTable.color })
    .from(subjectsTable)
    .where(inArray(subjectsTable.id, unique));
  for (const r of rows) map.set(r.id, r);
  return map;
}
