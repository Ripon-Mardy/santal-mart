import Link from "next/link";
import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <ShieldX className="size-16 text-destructive" />
      <h1 className="text-3xl font-bold">403 — Access Forbidden</h1>
      <p className="max-w-sm text-muted-foreground">You don&apos;t have permission to access this page.</p>
      <Button asChild>
        <Link href="/">Back to Home</Link>
      </Button>
    </div>
  );
}
