export interface TimeBlock {
  startsAt: string;
  endsAt: string;
}

export interface FreeSlot {
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
}

function setHM(date: Date, hm: string): Date {
  const [h, m] = hm.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

export function computeFreeSlots(
  date: Date,
  lessons: TimeBlock[],
  dayStart: string,
  dayEnd: string,
): FreeSlot[] {
  const start = setHM(date, dayStart);
  const end = setHM(date, dayEnd);
  if (end <= start) return [];

  const sorted = lessons
    .map((l) => ({ s: new Date(l.startsAt), e: new Date(l.endsAt) }))
    .filter((l) => !Number.isNaN(l.s.getTime()) && !Number.isNaN(l.e.getTime()))
    .sort((a, b) => a.s.getTime() - b.s.getTime());

  const slots: FreeSlot[] = [];
  let cursor = start;
  for (const ev of sorted) {
    if (ev.s > cursor) {
      const slotEnd = ev.s > end ? end : ev.s;
      if (slotEnd > cursor) {
        slots.push({
          startsAt: cursor.toISOString(),
          endsAt: slotEnd.toISOString(),
          durationMinutes: Math.round(
            (slotEnd.getTime() - cursor.getTime()) / 60000,
          ),
        });
      }
    }
    if (ev.e > cursor) cursor = ev.e;
    if (cursor >= end) break;
  }
  if (cursor < end) {
    slots.push({
      startsAt: cursor.toISOString(),
      endsAt: end.toISOString(),
      durationMinutes: Math.round((end.getTime() - cursor.getTime()) / 60000),
    });
  }
  return slots.filter((s) => s.durationMinutes > 0);
}

export function hoursUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (t - Date.now()) / 3_600_000;
}

export function isUrgent(
  iso: string | null | undefined,
  thresholdHours: number,
): boolean {
  const h = hoursUntil(iso);
  if (h === null) return false;
  return h >= 0 && h <= thresholdHours;
}
