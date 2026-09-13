import type { Metadata } from "next";

import { requireUser } from "@/lib/rbac";
import { ChangePasswordForm } from "@/components/account/change-password-form";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage() {
  await requireUser();

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Security</h1>
      <ChangePasswordForm />
    </div>
  );
}
