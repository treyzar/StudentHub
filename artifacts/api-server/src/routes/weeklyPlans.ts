import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, weeklyPlansTable } from "@workspace/db";
import { UpsertCurrentWeeklyPlanBody } from "@workspace/api-zod";
import { mapWeeklyPlan } from "../lib/mappers";

const router: IRouter = Router();

function startOfWeekISO(d: Date): string {
  const day = d.getDay();
  const diff = (day + 6) % 7; // monday
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

router.get("/weekly-plans/current", async (_req, res): Promise<void> => {
  const wsd = startOfWeekISO(new Date());
  const [row] = await db.select().from(weeklyPlansTable).where(eq(weeklyPlansTable.weekStartDate, wsd));
  if (!row) {
    const [created] = await db.insert(weeklyPlansTable).values({
      weekStartDate: wsd,
      goals: "",
      notes: "",
      status: "active",
    }).returning();
    res.json(mapWeeklyPlan(created));
    return;
  }
  res.json(mapWeeklyPlan(row));
});

router.put("/weekly-plans/current", async (req, res): Promise<void> => {
  const parsed = UpsertCurrentWeeklyPlanBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const wsdRaw = parsed.data.weekStartDate;
  const wsd = (wsdRaw instanceof Date ? wsdRaw : new Date(wsdRaw as unknown as string)).toISOString().slice(0, 10);
  const [existing] = await db.select().from(weeklyPlansTable).where(eq(weeklyPlansTable.weekStartDate, wsd));
  if (existing) {
    const [row] = await db.update(weeklyPlansTable).set({
      goals: parsed.data.goals,
      notes: parsed.data.notes,
      status: parsed.data.status,
    }).where(eq(weeklyPlansTable.weekStartDate, wsd)).returning();
    res.json(mapWeeklyPlan(row));
    return;
  }
  const [row] = await db.insert(weeklyPlansTable).values({
    weekStartDate: wsd,
    goals: parsed.data.goals,
    notes: parsed.data.notes,
    status: parsed.data.status,
  }).returning();
  res.json(mapWeeklyPlan(row));
});

export default router;
