import type { Metadata } from "next";

import { RegisterSellerWizard } from "@/components/auth/register-seller-wizard";

export const metadata: Metadata = { title: "Become a Seller" };

export default function RegisterSellerPage() {
  return <RegisterSellerWizard />;
}
