import { format } from "date-fns";
import { ru } from "date-fns/locale";

export type TimeFormat = "24h" | "12h";

export function formatTime(
  value: Date | string,
  timeFormat: TimeFormat = "24h",
): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, timeFormat === "12h" ? "h:mm a" : "HH:mm", { locale: ru });
}

export function formatDayTime(
  value: Date | string,
  timeFormat: TimeFormat = "24h",
): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(
    d,
    timeFormat === "12h" ? "d MMM h:mm a" : "d MMM HH:mm",
    { locale: ru },
  );
}
