import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Store as StoreIcon, Package, Users, MapPin } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchProducts, type ProductSort } from "@/services/search.service";
import { getSellerRatingSummary } from "@/features/products/queries";
import { getUserWishlistProductIds } from "@/features/home/queries";
import { ProductGrid, ProductCard } from "@/components/shared/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { SortSelect } from "@/components/search/sort-select";
import { Rating } from "@/components/shared/rating";
import { StoreFollowButton } from "@/components/store/store-follow-button";
import { SearchX, Mail, Phone } from "lucide-react";

export async function generateMetadata({ params }: PageProps<"/stores/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const store = await prisma.store.findUnique({ where: { slug } });
  if (!store) return {};
  return {
    title: store.seoTitle || store.name,
    description: store.seoDescription || store.description || `Shop ${store.name} on BazarX`,
    alternates: { canonical: `/stores/${store.slug}` },
  };
}

export default async function StoreDetailPage({ params, searchParams }: PageProps<"/stores/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const get = (key: string) => (Array.isArray(sp[key]) ? sp[key][0] : sp[key]);

  const store = await prisma.store.findUnique({
    where: { slug },
    include: { seller: { select: { id: true, status: true } }, _count: { select: { products: true, follows: true } } },
  });
  if (!store || store.seller.status !== "APPROVED") notFound();

  const session = await auth();
  const page = Number(get("page")) || 1;

  const [result, sellerRating, wishlistIds, isFollowing] = await Promise.all([
    searchProducts({ sellerSlug: slug, sort: (get("sort") as ProductSort) || "newest", page }),
    getSellerRatingSummary(store.seller.id),
    session?.user ? getUserWishlistProductIds(session.user.id) : Promise.resolve(new Set<string>()),
    session?.user ? prisma.storeFollow.findFirst({ where: { userId: session.user.id, storeId: store.id } }) : Promise.resolve(null),
  ]);

  return (
    <div>
      <div className="relative h-40 bg-muted sm:h-56">
        {store.bannerUrl && <Image src={store.bannerUrl} alt="" fill className="object-cover" sizes="100vw" priority />}
      </div>
      <div className="mx-auto max-w-7xl px-4">
        <div className="-mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-muted">
              {store.logoUrl ? <Image src={store.logoUrl} alt={store.name} fill className="object-cover" sizes="96px" /> : <StoreIcon className="size-8 text-muted-foreground" />}
            </div>
            <div className="pb-1">
              <h1 className="text-2xl font-bold">{store.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {sellerRating.count > 0 && <Rating value={sellerRating.overall} count={sellerRating.count} />}
                <span className="flex items-center gap-1"><Package className="size-3.5" /> {store._count.products} products</span>
                <span className="flex items-center gap-1"><Users className="size-3.5" /> {store._count.follows} followers</span>
                {store.city && <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {store.city}</span>}
              </div>
            </div>
          </div>
          <StoreFollowButton storeId={store.id} storeName={store.name} initialFollowing={!!isFollowing} />
        </div>

        {store.description && <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{store.description}</p>}

        <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {store.email && <a href={`mailto:${store.email}`} className="flex items-center gap-1.5 hover:text-primary"><Mail className="size-4" /> Contact Seller</a>}
          {store.phone && <span className="flex items-center gap-1.5"><Phone className="size-4" /> {store.phone}</span>}
        </div>

        <div className="mt-8 flex items-center justify-between border-t pt-6">
          <h2 className="font-semibold">Products from this store</h2>
          <SortSelect />
        </div>

        <div className="pb-10 pt-4">
          {result.items.length === 0 ? (
            <EmptyState icon={SearchX} title="No products yet" description="This store hasn't listed any products yet." />
          ) : (
            <>
              <ProductGrid>
                {result.items.map((product) => (
                  <ProductCard key={product.id} product={product} inWishlist={wishlistIds.has(product.id)} />
                ))}
              </ProductGrid>
              <div className="mt-8 flex justify-center">
                <PaginationBar page={result.page} totalPages={result.totalPages} basePath={`/stores/${slug}`} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
