import "server-only";

import { auth } from "@/lib/auth";
import { AppError } from "@/lib/api-response";
import type { Role } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/rbac";

/**
 * Route Handler equivalent of lib/rbac.ts. `forbidden()`/`unauthorized()`
 * only work inside a rendered Server Component tree (they render
 * forbidden.tsx/unauthorized.tsx) — a Route Handler has no such tree, so
 * these throw a normal AppError that withApiErrorHandling turns into a
 * proper 401/403 JSON response instead.
 */
export async function requireUserApi(): Promise<CurrentUser> {
  const session = await auth();
  if (!session?.user) throw new AppError("Authentication required", "UNAUTHENTICATED", 401);
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    sellerId: session.user.sellerId,
    sellerStatus: session.user.sellerStatus,
  };
}

export async function requireRoleApi(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUserApi();
  if (!roles.includes(user.role)) throw new AppError("You don't have permission to do this", "FORBIDDEN", 403);
  return user;
}

export async function requireAdminApi(): Promise<CurrentUser> {
  return requireRoleApi("ADMIN", "SUPER_ADMIN");
}

export async function requireApprovedSellerApi(): Promise<CurrentUser & { sellerId: string }> {
  const user = await requireRoleApi("SELLER");
  if (!user.sellerId || user.sellerStatus !== "APPROVED") {
    throw new AppError("Your seller account isn't approved", "SELLER_NOT_APPROVED", 403);
  }
  return { ...user, sellerId: user.sellerId };
}
