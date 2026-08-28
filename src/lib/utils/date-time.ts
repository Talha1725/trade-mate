import { DISPLAY_TIME_ZONE } from "@/constants/timezone";

export function formatNewYorkDateTime(value: string | number | Date | null | undefined): string {
  if (value == null || value === "") return "-";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: DISPLAY_TIME_ZONE, timeZoneName: "short",
  });
}

export function formatNewYorkDate(value: string | number | Date | null | undefined): string {
  if (value == null || value === "") return "-";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-US", {
    month: "short", day: "numeric", timeZone: DISPLAY_TIME_ZONE, timeZoneName: "short",
  });
}
