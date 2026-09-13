import { Check } from "lucide-react";

import { formatDateTime } from "@/lib/format";
import { formatStatus } from "@/lib/format";
import { cn } from "cn";

const FULL_FLOW = ["PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

export function OrderTimeline({ events, currentStatus }: { events: { status: string; createdAt: Date; note?: string | null }[]; currentStatus: string }) {
  const isTerminalNegative = ["CANCELLED", "RETURNED", "REFUNDED", "RETURN_REQUESTED"].includes(currentStatus);
  const eventMap = new Map(events.map((e) => [e.status, e]));
  const currentIndex = FULL_FLOW.indexOf(currentStatus);

  if (isTerminalNegative) {
    return (
      <div className="space-y-3">
        {events.map((event, i) => (
          <div key={i} className="flex gap-3 text-sm">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">•</div>
            <div>
              <p className="font-medium">{formatStatus(event.status)}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
              {event.note && <p className="text-xs text-muted-foreground">{event.note}</p>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ol className="relative ml-3 space-y-6 border-l pl-6">
      {FULL_FLOW.map((status, i) => {
        const event = eventMap.get(status);
        const done = i <= currentIndex;
        return (
          <li key={status} className="relative">
            <span
              className={cn(
                "absolute -left-[31px] flex size-5 items-center justify-center rounded-full border-2",
                done ? "border-primary bg-primary text-primary-foreground" : "border-muted bg-background text-muted-foreground"
              )}
            >
              {done && <Check className="size-3" />}
            </span>
            <p className={cn("text-sm font-medium", !done && "text-muted-foreground")}>{formatStatus(status)}</p>
            {event && <p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>}
          </li>
        );
      })}
    </ol>
  );
}
