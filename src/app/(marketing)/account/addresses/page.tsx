import type { Metadata } from "next";
import { MapPinOff } from "lucide-react";

import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AddressCard } from "@/components/address/address-card";
import { AddressFormDialog } from "@/components/address/address-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "My Addresses" };

export default async function AddressesPage() {
  const user = await requireUser();
  const addresses = await prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">My Addresses</h1>
        <AddressFormDialog />
      </div>

      {addresses.length === 0 ? (
        <EmptyState icon={MapPinOff} title="No addresses saved" description="Add an address to speed up checkout." />
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={{
                id: address.id,
                fullName: address.fullName,
                phone: address.phone,
                line1: address.line1,
                city: address.city,
                division: address.division,
                postalCode: address.postalCode ?? "",
                country: address.country,
                type: address.type,
                isDefault: address.isDefault,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
