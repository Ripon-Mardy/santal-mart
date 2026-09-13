import type { Metadata } from "next";
import Image from "next/image";
import { ImageIcon } from "lucide-react";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { BannerFormDialog } from "@/components/admin/banner-form-dialog";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { deleteBannerAction } from "@/features/admin/actions";

export const metadata: Metadata = { title: "Banners" };

export default async function AdminBannersPage() {
  await requireAdmin();
  const banners = await prisma.banner.findMany({ orderBy: [{ type: "asc" }, { sortOrder: "asc" }] });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{banners.length} banners</p>
        <BannerFormDialog />
      </div>

      {banners.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No banners yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner) => (
            <div key={banner.id} className="overflow-hidden rounded-xl border">
              <div className="relative h-32 bg-muted">
                <Image src={banner.imageUrl} alt={banner.title} fill className="object-cover" sizes="400px" />
                <Badge className="absolute left-2 top-2">{banner.type}</Badge>
              </div>
              <div className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{banner.title}</p>
                  {banner.isActive ? <Badge variant="outline" className="mt-1">Active</Badge> : <Badge variant="outline" className="mt-1 text-muted-foreground">Inactive</Badge>}
                </div>
                <div className="flex items-center">
                  <BannerFormDialog
                    banner={{
                      id: banner.id, title: banner.title, subtitle: banner.subtitle, imageUrl: banner.imageUrl,
                      ctaText: banner.ctaText, ctaUrl: banner.ctaUrl, type: banner.type, isActive: banner.isActive, sortOrder: banner.sortOrder,
                    }}
                  />
                  <DeleteEntityButton onDelete={deleteBannerAction.bind(null, banner.id)} entityLabel="banner" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
