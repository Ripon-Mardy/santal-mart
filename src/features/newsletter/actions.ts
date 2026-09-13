"use server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/features/auth/actions";

const schema = z.object({ email: z.email() });

export async function subscribeToNewsletter(formData: unknown): Promise<ActionResult> {
  const parsed = schema.safeParse(formData);
  if (!parsed.success) return { success: false, message: "Enter a valid email address" };

  await prisma.newsletterSubscriber.upsert({
    where: { email: parsed.data.email.toLowerCase() },
    update: {},
    create: { email: parsed.data.email.toLowerCase() },
  });

  return { success: true };
}
