import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SectionHeading({ title, subtitle, viewAllHref }: { title: string; subtitle?: string; viewAllHref?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <h2 className="text-lg font-bold text-foreground sm:text-xl">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {viewAllHref && (
        <Link href={viewAllHref} className="flex items-center text-sm font-medium text-primary hover:underline">
          View all <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
