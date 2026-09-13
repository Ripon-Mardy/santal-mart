import type { Metadata } from "next";

import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/account/profile-form";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const authUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: authUser.id } });

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">My Profile</h1>
      <ProfileForm user={{ name: user.name, email: user.email, phone: user.phone, avatarUrl: user.avatarUrl }} />
    </div>
  );
}
