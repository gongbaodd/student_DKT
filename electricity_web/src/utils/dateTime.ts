export function parseLocalTimestamp(iso: string): number {
  const [datePart, timePart = "00:00:00"] = iso.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, second).getTime();
}

export function dayStartMs(day: string): number {
  const [year, month, dayNum] = day.split("-").map(Number);
  return new Date(year, month - 1, dayNum).getTime();
}

export function nextDayStartMs(day: string): number {
  const [year, month, dayNum] = day.split("-").map(Number);
  return new Date(year, month - 1, dayNum + 1).getTime();
}

export function weekdayForDay(day: string): number {
  const [year, month, dayNum] = day.split("-").map(Number);
  return new Date(year, month - 1, dayNum).getDay();
}

export function timeOnDayMs(day: string, hours: number, minutes: number): number {
  const [year, month, dayNum] = day.split("-").map(Number);
  return new Date(year, month - 1, dayNum, hours, minutes).getTime();
}

export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function formatAxisDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("en-US", { month: "short", day: "numeric" });
}

export function formatChartDate(iso: string): string {
  return formatIntervalTs(parseLocalTimestamp(iso));
}

export function formatIntervalTs(ts: number): string {
  const d = new Date(ts);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  const hour = d.getHours().toString().padStart(2, "0");
  const minute = d.getMinutes().toString().padStart(2, "0");
  return `${month} ${day} ${hour}:${minute}`;
}
