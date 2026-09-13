"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/rbac";
import { markNotificationRead, markAllNotificationsRead } from "@/services/notification.service";
import type { ActionResult } from "@/features/auth/actions";

export async function markNotificationReadAction(notificationId: string): Promise<ActionResult> {
  const user = await requireUser();
  await markNotificationRead(notificationId, user.id);
  revalidatePath("/", "layout");
  return { success: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireUser();
  await markAllNotificationsRead(user.id);
  revalidatePath("/", "layout");
  return { success: true };
}
