import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Reset Password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const sp = await searchParams;
  const token = Array.isArray(sp.token) ? sp.token[0] : (sp.token ?? "");

  if (!token) {
    return <p className="text-sm text-muted-foreground">This reset link is invalid.</p>;
  }

  return <ResetPasswordForm token={token} />;
}
