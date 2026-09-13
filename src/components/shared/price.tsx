import { formatCurrency } from "@/lib/currency";
import { cn } from "cn";

export function Price({
  amount,
  compareAtAmount,
  size = "md",
  className,
}: {
  amount: number | string;
  compareAtAmount?: number | string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const hasDiscount = compareAtAmount && Number(compareAtAmount) > Number(amount);
  const sizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-2xl",
  };

  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className={cn("font-semibold text-foreground tabular-nums", sizes[size])}>{formatCurrency(amount)}</span>
      {hasDiscount && (
        <span className="text-muted-foreground text-sm line-through tabular-nums">{formatCurrency(compareAtAmount!)}</span>
      )}
    </span>
  );
}

export function DiscountPercent({ amount, compareAtAmount }: { amount: number | string; compareAtAmount?: number | string | null }) {
  if (!compareAtAmount || Number(compareAtAmount) <= Number(amount)) return null;
  const pct = Math.round((1 - Number(amount) / Number(compareAtAmount)) * 100);
  if (pct <= 0) return null;
  return <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">-{pct}%</span>;
}
