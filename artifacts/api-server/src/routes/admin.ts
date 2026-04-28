import { Router, type IRouter } from "express";
import {
  db,
  subjectsTable,
  lessonsTable,
  tasksTable,
  debtsTable,
  gradesTable,
  testsTable,
  notesTable,
  weeklyPlansTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const TABLES = {
  subjects: subjectsTable,
  lessons: lessonsTable,
  tasks: tasksTable,
  debts: debtsTable,
  grades: gradesTable,
  tests: testsTable,
  notes: notesTable,
  weeklyPlans: weeklyPlansTable,
} as const;

router.get("/admin/export", async (_req, res): Promise<void> => {
  try {
    const data: Record<string, unknown[]> = {};
    for (const [name, table] of Object.entries(TABLES)) {
      data[name] = await db.select().from(table as never);
    }
    res.json({
      exportedAt: new Date().toISOString(),
      version: 1,
      data,
    });
  } catch (error) {
    logger.error({ err: error }, "Export failed");
    res.status(500).json({ error: "Не удалось выполнить экспорт" });
  }
});

router.post("/admin/import", async (req, res): Promise<void> => {
  const body = req.body as {
    data?: Record<string, unknown[]>;
    replace?: boolean;
  } | null;

  if (!body || typeof body !== "object" || !body.data) {
    res.status(400).json({ error: "Ожидается JSON с полем data" });
    return;
  }

  const replace = body.replace !== false;

  try {
    await db.transaction(async (tx) => {
      if (replace) {
        // Order matters due to FKs: delete dependents first
        await tx.delete(weeklyPlansTable);
        await tx.delete(notesTable);
        await tx.delete(testsTable);
        await tx.delete(gradesTable);
        await tx.delete(debtsTable);
        await tx.delete(tasksTable);
        await tx.delete(lessonsTable);
        await tx.delete(subjectsTable);
      }

      const insertOrder: Array<keyof typeof TABLES> = [
        "subjects",
        "lessons",
        "tasks",
        "debts",
        "grades",
        "tests",
        "notes",
        "weeklyPlans",
      ];

      for (const name of insertOrder) {
        const rows = body.data?.[name];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        const table = TABLES[name];
        // Convert ISO date strings back to Date objects for date columns.
        const cleaned = rows.map((row) => {
          const r = { ...(row as Record<string, unknown>) };
          for (const [k, v] of Object.entries(r)) {
            if (
              typeof v === "string" &&
              /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(v)
            ) {
              const d = new Date(v);
              if (!Number.isNaN(d.getTime())) r[k] = d;
            }
          }
          return r;
        });
        await tx.insert(table as never).values(cleaned as never);

        // Reset autoincrement sequence to MAX(id)+1 if id column exists.
        const hasId = cleaned.some(
          (r) => (r as Record<string, unknown>).id != null,
        );
        if (hasId) {
          const tableName = (table as { _: { name: string } })._.name;
          await tx.execute(sql.raw(
            `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'),
              COALESCE((SELECT MAX(id) FROM "${tableName}"), 1), true)`,
          ));
        }
      }
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Import failed");
    res
      .status(500)
      .json({
        error: "Не удалось импортировать данные",
        details: error instanceof Error ? error.message : String(error),
      });
  }
});

router.delete("/admin/data", async (_req, res): Promise<void> => {
  try {
    await db.transaction(async (tx) => {
      await tx.delete(weeklyPlansTable);
      await tx.delete(notesTable);
      await tx.delete(testsTable);
      await tx.delete(gradesTable);
      await tx.delete(debtsTable);
      await tx.delete(tasksTable);
      await tx.delete(lessonsTable);
      await tx.delete(subjectsTable);
    });
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Clear failed");
    res.status(500).json({ error: "Не удалось очистить данные" });
  }
});

export default router;
