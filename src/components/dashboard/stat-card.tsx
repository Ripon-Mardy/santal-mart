import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { cn } from "cn";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  href,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: number; label?: string };
  href?: string;
}) {
  const Wrapper = href ? "a" : "div";

  return (
    <Wrapper href={href} className="block rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {trend && (
        <p className={cn("mt-1 flex items-center gap-1 text-xs", trend.value >= 0 ? "text-emerald-600" : "text-destructive")}>
          {trend.value >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {Math.abs(trend.value)}% {trend.label ?? "vs last period"}
        </p>
      )}
    </Wrapper>
  );
}
