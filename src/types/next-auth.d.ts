import type { Role, SellerStatus } from "@/generated/prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    sellerId?: string | null;
    sellerStatus?: SellerStatus | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      sellerId?: string | null;
      sellerStatus?: SellerStatus | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    sellerId?: string | null;
    sellerStatus?: SellerStatus | null;
  }
}
