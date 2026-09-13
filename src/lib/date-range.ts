export type DateRangeKey = "today" | "7d" | "30d" | "90d" | "1y";

export function resolveDateRange(key: string | undefined): { from: Date; label: string } {
  const now = new Date();
  switch (key) {
    case "today": {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      return { from, label: "Today" };
    }
    case "90d":
      return { from: new Date(now.getTime() - 90 * 86_400_000), label: "Last 3 months" };
    case "1y":
      return { from: new Date(now.getTime() - 365 * 86_400_000), label: "Last year" };
    case "30d":
      return { from: new Date(now.getTime() - 30 * 86_400_000), label: "Last 30 days" };
    case "7d":
    default:
      return { from: new Date(now.getTime() - 7 * 86_400_000), label: "Last 7 days" };
  }
}

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDayLabel(key: string): string {
  return new Date(key).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
