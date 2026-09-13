import { Badge } from "@/components/ui/badge";
import { formatStatus } from "@/lib/format";
import { cn } from "cn";

const STATUS_STYLES: Record<string, string> = {
  // Neutral / pending
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400",
  PENDING_REVIEW: "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400",
  DRAFT: "bg-muted text-muted-foreground",
  REQUESTED: "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400",
  PROCESSING: "bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400",

  // Positive / progress
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400",
  PACKED: "bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400",
  SHIPPED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-400",
  OUT_FOR_DELIVERY: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-400",
  APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400",
  DELIVERED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400",
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400",
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400",
  RECEIVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400",
  PICKUP: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-400",

  // Negative / terminal
  CANCELLED: "bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400",
  REJECTED: "bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400",
  SUSPENDED: "bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400",
  FAILED: "bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400",
  RETURN_REQUESTED: "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400",
  RETURNED: "bg-slate-200 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300",
  REFUNDED: "bg-slate-200 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300",
  PARTIALLY_REFUNDED: "bg-slate-200 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300",
  ARCHIVED: "bg-slate-200 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-0 font-medium", STATUS_STYLES[status] ?? "bg-muted text-muted-foreground", className)}>
      {formatStatus(status)}
    </Badge>
  );
}
