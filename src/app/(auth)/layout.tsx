import Link from "next/link";

import { siteConfig } from "@/config/site";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b bg-background py-4">
        <div className="mx-auto max-w-7xl px-4">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-primary">
            {siteConfig.name}
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">{children}</main>
    </div>
  );
}
