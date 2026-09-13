import { Star } from "lucide-react";

import { cn } from "cn";

export function Rating({
  value,
  count,
  size = "sm",
  className,
}: {
  value: number | string;
  count?: number;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const rating = Number(value);
  const sizeClass = { xs: "size-3", sm: "size-3.5", md: "size-4" }[size];

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(sizeClass, i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/40")}
          />
        ))}
      </span>
      {rating > 0 && <span className="text-muted-foreground text-xs font-medium">{rating.toFixed(1)}</span>}
      {typeof count === "number" && <span className="text-muted-foreground text-xs">({count})</span>}
    </span>
  );
}
