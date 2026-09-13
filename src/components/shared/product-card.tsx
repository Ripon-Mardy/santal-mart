import Image from "next/image";
import Link from "next/link";

import { Price, DiscountPercent } from "@/components/shared/price";
import { Rating } from "@/components/shared/rating";
import { WishlistButton } from "@/components/shared/wishlist-button";
import { toNumber } from "@/lib/currency";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: unknown;
  compareAtPrice: unknown;
  avgRating: unknown;
  reviewCount: number;
  images: { url: string; altText?: string | null }[];
  store: { name: string; slug: string };
  inventory: { stock: number; reserved: number }[];
};

export function ProductCard({ product, inWishlist = false }: { product: ProductCardData; inWishlist?: boolean }) {
  const available = product.inventory.reduce((sum, i) => sum + Math.max(0, i.stock - i.reserved), 0);
  const outOfStock = available <= 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
        {product.images[0] ? (
          <Image
            src={product.images[0].url}
            alt={product.images[0].altText ?? product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-xs">No image</div>
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          <DiscountPercent amount={toNumber(product.price)} compareAtAmount={toNumber(product.compareAtPrice)} />
        </div>
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">Out of stock</span>
          </div>
        )}
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <WishlistButton productId={product.id} initialInWishlist={inWishlist} className="size-8 bg-background/90 backdrop-blur" />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link href={`/stores/${product.store.slug}`} className="text-xs text-muted-foreground hover:text-primary">
          {product.store.name}
        </Link>
        <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-10 text-sm font-medium text-foreground hover:text-primary">
          {product.name}
        </Link>
        <Rating value={toNumber(product.avgRating)} count={product.reviewCount} />
        <Price amount={toNumber(product.price)} compareAtAmount={toNumber(product.compareAtPrice)} className="mt-1" />
      </div>
    </div>
  );
}

export function ProductGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">{children}</div>;
}
