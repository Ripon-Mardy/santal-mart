import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

/**
 * Next.js 16 route proxy (formerly "middleware"). This is a UX convenience
 * that redirects unauthenticated/wrong-role users before a page even
 * renders — it is NOT the security boundary. Every server action and route
 * handler re-checks authorization itself via `lib/rbac.ts`, because a proxy
 * can be bypassed by calling a server action directly.
 */
export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isSellerRoute = nextUrl.pathname.startsWith("/seller");
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isAccountRoute = nextUrl.pathname.startsWith("/account");

  if ((isSellerRoute || isAdminRoute || isAccountRoute) && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isSellerRoute && role !== "SELLER") {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (isAdminRoute && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/seller/:path*", "/admin/:path*", "/account/:path*"],
};
