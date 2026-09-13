import "server-only";

import { forbidden, unauthorized } from "next/navigation";

import { auth } from "@/lib/auth";
import type { Role } from "@/generated/prisma/client";

/**
 * Server-side authorization helpers. These are the ONLY source of truth for
 * access control — route guards in `proxy.ts` are a UX convenience (fast
 * redirect before a page even renders) and must never be relied on alone.
 * Every server action / route handler that mutates data calls one of these
 * first.
 */

export type CurrentUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  sellerId?: string | null;
  sellerStatus?: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    sellerId: session.user.sellerId,
    sellerStatus: session.user.sellerStatus,
  };
}

/** Any authenticated user, regardless of role. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) unauthorized();
  return user;
}

/** Authenticated user whose role is one of `roles`. */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) forbidden();
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  return requireRole("ADMIN", "SUPER_ADMIN");
}

export async function requireSuperAdmin(): Promise<CurrentUser> {
  return requireRole("SUPER_ADMIN");
}

/** An approved seller. Returns the seller id for scoping every query. */
export async function requireApprovedSeller(): Promise<CurrentUser & { sellerId: string }> {
  const user = await requireRole("SELLER");
  if (!user.sellerId) forbidden();
  if (user.sellerStatus !== "APPROVED") forbidden();
  return { ...user, sellerId: user.sellerId };
}

/** A seller account regardless of approval status (for onboarding/status pages). */
export async function requireSeller(): Promise<CurrentUser & { sellerId: string }> {
  const user = await requireRole("SELLER");
  if (!user.sellerId) forbidden();
  return { ...user, sellerId: user.sellerId };
}
