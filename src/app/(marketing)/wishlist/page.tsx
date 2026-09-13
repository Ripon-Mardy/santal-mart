import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";

import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PRODUCT_CARD_SELECT } from "@/services/search.service";
import { ProductGrid, ProductCard } from "@/components/shared/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const user = await requireUser();

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: user.id },
    include: { items: { orderBy: { createdAt: "desc" }, include: { product: { select: PRODUCT_CARD_SELECT } } } },
  });

  const products = wishlist?.items.map((i) => i.product) ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-xl font-bold">My Wishlist</h1>
      <p className="mt-1 text-sm text-muted-foreground">{products.length} saved item(s)</p>

      {products.length === 0 ? (
        <EmptyState
          icon={Heart}
          className="mt-6"
          title="Your wishlist is empty"
          description="Save products you love to buy them later."
          action={<Button asChild><Link href="/search">Browse Products</Link></Button>}
        />
      ) : (
        <div className="mt-6">
          <ProductGrid>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} inWishlist />
            ))}
          </ProductGrid>
        </div>
      )}
    </div>
  );
}
