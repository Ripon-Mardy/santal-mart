import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/validations/auth";
import type { Role, SellerStatus } from "@/generated/prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          include: { seller: { select: { id: true, status: true } } },
        });

        if (!user || !user.password) return null;
        if (user.status === "SUSPENDED") return null;

        const isValid = await bcrypt.compare(parsed.data.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
          role: user.role,
          sellerId: user.seller?.id ?? null,
          sellerStatus: user.seller?.status ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.sellerId = user.sellerId ?? null;
        token.sellerStatus = user.sellerStatus ?? null;
      }

      // Keep seller status fresh so an approval/suspension takes effect
      // without forcing the user to log out and back in.
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: { seller: { select: { id: true, status: true } } },
        });
        if (fresh) {
          token.role = fresh.role;
          token.sellerId = fresh.seller?.id ?? null;
          token.sellerStatus = fresh.seller?.status ?? null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Module augmentation of `next-auth/jwt`'s JWT type doesn't merge
      // cleanly through this version's re-export chain, so `token` fields
      // read back as `unknown` — cast explicitly rather than fight it.
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.sellerId = (token.sellerId as string | null) ?? null;
        session.user.sellerStatus = (token.sellerStatus as SellerStatus | null) ?? null;
      }
      return session;
    },
  },
});
