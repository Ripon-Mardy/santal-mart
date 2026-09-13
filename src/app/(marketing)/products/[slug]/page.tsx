import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Truck, RotateCcw, ShieldCheck, Store as StoreIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/currency";
import { getProductBySlug, getProductReviews, getReviewableOrderItems, getSellerRatingSummary } from "@/features/products/queries";
import { getRelatedProducts, getFrequentlyBoughtTogether, trackRecentlyViewed } from "@/services/recommendation.service";
import { getUserWishlistProductIds } from "@/features/home/queries";
import { ImageGallery } from "@/components/product/image-gallery";
import { ProductBuyBox } from "@/components/product/product-buy-box";
import { ReviewsSection } from "@/components/product/reviews-section";
import { ProductRail } from "@/components/home/product-rail";
import { Rating } from "@/components/shared/rating";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StoreFollowButton } from "@/components/store/store-follow-button";
import { siteConfig } from "@/config/site";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  return {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.shortDescription || product.description.slice(0, 160),
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.shortDescription ?? undefined,
      images: product.images[0] ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product || (product.status !== "APPROVED" && product.status !== "ARCHIVED") || !product.isPublished) {
    notFound();
  }

  const session = await auth();
  const userId = session?.user?.id;

  const [reviewsData, related, frequentlyBought, sellerRating, wishlistIds, reviewableItems, storeFollow] = await Promise.all([
    getProductReviews(product.id),
    getRelatedProducts(product.id),
    getFrequentlyBoughtTogether(product.id),
    getSellerRatingSummary(product.sellerId),
    userId ? getUserWishlistProductIds(userId) : Promise.resolve(new Set<string>()),
    userId ? getReviewableOrderItems(userId, product.id) : Promise.resolve([]),
    userId ? prisma.storeFollow.findFirst({ where: { userId, storeId: product.store.id } }) : Promise.resolve(null),
  ]);

  if (userId) {
    void trackRecentlyViewed(userId, product.id);
  }

  const baseInventory = product.inventory.find((i) => i.variantId === null);
  const baseAvailable = baseInventory ? baseInventory.stock - baseInventory.reserved : 0;

  const variantOptions = product.variants.map((v) => {
    const inv = v.inventory;
    return {
      id: v.id,
      name: v.name,
      options: (v.options as Record<string, string>) ?? {},
      price: v.price ? toNumber(v.price) : null,
      available: inv ? inv.stock - inv.reserved : 0,
    };
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map((i) => i.url),
    description: product.shortDescription ?? product.description,
    sku: product.sku,
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    aggregateRating:
      product.reviewCount > 0
        ? { "@type": "AggregateRating", ratingValue: toNumber(product.avgRating), reviewCount: product.reviewCount }
        : undefined,
    offers: {
      "@type": "Offer",
      url: `${siteConfig.url}/products/${product.slug}`,
      priceCurrency: "BDT",
      price: toNumber(product.price),
      availability: baseAvailable > 0 || variantOptions.some((v) => v.available > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: product.category.name, item: `${siteConfig.url}/category/${product.category.slug}` },
      { "@type": "ListItem", position: 3, name: product.name, item: `${siteConfig.url}/products/${product.slug}` },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link href="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          {product.category.parent && (
            <>
              <BreadcrumbItem><BreadcrumbLink asChild><Link href={`/category/${product.category.parent.slug}`}>{product.category.parent.name}</Link></BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem><BreadcrumbLink asChild><Link href={`/category/${product.category.slug}`}>{product.category.name}</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage className="line-clamp-1">{product.name}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-8 pb-20 md:grid-cols-2 md:pb-0">
        <ImageGallery images={product.images} productName={product.name} />

        <div className="space-y-4">
          {product.status === "ARCHIVED" && <Badge variant="outline">No longer available</Badge>}
          {product.brand && <p className="text-sm text-muted-foreground">{product.brand.name}</p>}
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <div className="flex items-center gap-3">
            <Rating value={toNumber(product.avgRating)} count={product.reviewCount} size="md" />
            <span className="text-sm text-muted-foreground">{product.soldCount} sold</span>
          </div>

          <Link href={`/stores/${product.store.slug}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50">
            <span className="flex items-center gap-2 text-sm">
              <StoreIcon className="size-4 text-muted-foreground" />
              <span>
                Sold by <strong>{product.store.name}</strong>
              </span>
              {sellerRating.count > 0 && <Rating value={sellerRating.overall} count={sellerRating.count} size="xs" />}
            </span>
            <StoreFollowButton storeId={product.store.id} storeName={product.store.name} initialFollowing={!!storeFollow} />
          </Link>

          <ProductBuyBox
            productId={product.id}
            productName={product.name}
            basePrice={toNumber(product.price)}
            compareAtPrice={product.compareAtPrice ? toNumber(product.compareAtPrice) : null}
            baseAvailable={baseAvailable}
            variants={variantOptions}
            inWishlist={wishlistIds.has(product.id)}
          />

          <div className="grid grid-cols-1 gap-2 rounded-lg border p-3 text-sm sm:grid-cols-3">
            <span className="flex items-center gap-2"><Truck className="size-4 text-muted-foreground" /> {product.shippingInfo || "Standard delivery"}</span>
            <span className="flex items-center gap-2"><RotateCcw className="size-4 text-muted-foreground" /> {product.returnPolicy || "7-day return policy"}</span>
            <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-muted-foreground" /> {product.warranty || "Seller warranty"}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="description" className="mt-10">
        <TabsList>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="specifications">Specifications</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({product.reviewCount})</TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="prose prose-sm max-w-none pt-4 text-foreground">
          <p className="whitespace-pre-line text-sm text-muted-foreground">{product.description}</p>
        </TabsContent>
        <TabsContent value="specifications" className="pt-4">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between border-b py-1.5"><dt className="text-muted-foreground">SKU</dt><dd>{product.sku}</dd></div>
            <div className="flex justify-between border-b py-1.5"><dt className="text-muted-foreground">Category</dt><dd>{product.category.name}</dd></div>
            {product.brand && <div className="flex justify-between border-b py-1.5"><dt className="text-muted-foreground">Brand</dt><dd>{product.brand.name}</dd></div>}
            {product.weight && <div className="flex justify-between border-b py-1.5"><dt className="text-muted-foreground">Weight</dt><dd>{toNumber(product.weight)} kg</dd></div>}
          </dl>
        </TabsContent>
        <TabsContent value="reviews" className="pt-4">
          <ReviewsSection
            avgRating={toNumber(product.avgRating)}
            reviews={reviewsData.items}
            total={reviewsData.total}
            ratingBreakdown={reviewsData.ratingBreakdown}
            eligibleItems={reviewableItems}
          />
        </TabsContent>
      </Tabs>

      <ProductRail title="Frequently Bought Together" products={frequentlyBought} wishlistedIds={wishlistIds} />
      <ProductRail title="Related Products" products={related} wishlistedIds={wishlistIds} />

      {/* Sticky mobile purchase bar (spec §6) */}
      <div className="fixed inset-x-0 bottom-14 z-30 border-t bg-background p-3 shadow-lg md:hidden">
        <ProductBuyBox
          productId={product.id}
          productName={product.name}
          basePrice={toNumber(product.price)}
          compareAtPrice={product.compareAtPrice ? toNumber(product.compareAtPrice) : null}
          baseAvailable={baseAvailable}
          variants={variantOptions}
          inWishlist={wishlistIds.has(product.id)}
          sticky
        />
      </div>
    </div>
  );
}
