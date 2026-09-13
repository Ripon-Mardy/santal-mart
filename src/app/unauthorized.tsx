import Link from "next/link";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <LogIn className="size-16 text-muted-foreground" />
      <h1 className="text-3xl font-bold">401 — Sign In Required</h1>
      <p className="max-w-sm text-muted-foreground">Please sign in to access this page.</p>
      <Button asChild>
        <Link href="/login">Sign In</Link>
      </Button>
    </div>
  );
}
