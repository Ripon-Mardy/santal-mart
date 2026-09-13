import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { verifyEmail } from "@/features/auth/actions";

export const metadata: Metadata = { title: "Verify Email" };

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const sp = await searchParams;
  const token = Array.isArray(sp.token) ? sp.token[0] : sp.token;

  const result = token ? await verifyEmail(token) : { success: false as const, message: "Missing verification token" };

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        {result.success ? (
          <>
            <CheckCircle2 className="size-10 text-emerald-500" />
            <p className="font-medium">Email verified!</p>
            <p className="text-sm text-muted-foreground">Your account is now fully active.</p>
          </>
        ) : (
          <>
            <XCircle className="size-10 text-destructive" />
            <p className="font-medium">Verification failed</p>
            <p className="text-sm text-muted-foreground">{result.message}</p>
          </>
        )}
        <Button asChild className="mt-2">
          <Link href="/login">Go to Login</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
