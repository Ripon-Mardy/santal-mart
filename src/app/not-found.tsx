import Link from "next/link";
import { PackageX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <PackageX className="size-16 text-muted-foreground" />
      <h1 className="text-3xl font-bold">404 — Page Not Found</h1>
      <p className="max-w-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or may have been moved.</p>
      <Button asChild>
        <Link href="/">Back to Home</Link>
      </Button>
    </div>
  );
}
