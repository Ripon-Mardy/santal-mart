import type { Metadata } from "next";
import { Clock } from "lucide-react";

import { requireUser } from "@/lib/rbac";
import { getRecentlyViewedProducts, getUserWishlistProductIds } from "@/features/home/queries";
import { ProductGrid, ProductCard } from "@/components/shared/product-card";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Recently Viewed" };

export default async function RecentlyViewedPage() {
  const user = await requireUser();
  const [products, wishlistIds] = await Promise.all([
    getRecentlyViewedProducts(user.id, 20),
    getUserWishlistProductIds(user.id),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Recently Viewed</h1>
      {products.length === 0 ? (
        <EmptyState icon={Clock} title="No recently viewed products" description="Products you view will show up here." />
      ) : (
        <ProductGrid>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} inWishlist={wishlistIds.has(product.id)} />
          ))}
        </ProductGrid>
      )}
    </div>
  );
}
