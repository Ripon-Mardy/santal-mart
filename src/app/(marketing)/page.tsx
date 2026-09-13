import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { CategoryGrid } from "@/components/home/category-grid";
import { ProductRail } from "@/components/home/product-rail";
import { StoreGrid } from "@/components/home/store-grid";
import { SellerCta } from "@/components/home/seller-cta";
import { TrustSection } from "@/components/home/trust-section";
import { getRecommendedForUser } from "@/services/recommendation.service";
import {
  getActiveBanners,
  getPopularCategories,
  getFlashDeals,
  getFeaturedProducts,
  getBestSellers,
  getNewArrivals,
  getTopStores,
  getUserWishlistProductIds,
  getRecentlyViewedProducts,
} from "@/features/home/queries";

export const metadata: Metadata = {
  title: "Home",
};

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [banners, categories, flashDeals, featured, bestSellers, newArrivals, topStores, recommended, wishlisted, recentlyViewed] = await Promise.all([
    getActiveBanners("HERO"),
    getPopularCategories(),
    getFlashDeals(),
    getFeaturedProducts(),
    getBestSellers(),
    getNewArrivals(),
    getTopStores(),
    getRecommendedForUser(userId ?? null),
    userId ? getUserWishlistProductIds(userId) : Promise.resolve(new Set<string>()),
    userId ? getRecentlyViewedProducts(userId) : Promise.resolve([]),
  ]);

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <HeroCarousel banners={banners} />
      </div>

      <CategoryGrid categories={categories} />

      <ProductRail title="Deals You Don't Want to Miss" subtitle="Flash Deals" viewAllHref="/search?hasDiscount=true" products={flashDeals} wishlistedIds={wishlisted} />

      <StoreGrid stores={topStores} />

      <ProductRail title="Trending Products" subtitle="Featured across BazarX" viewAllHref="/search?featured=true" products={featured} wishlistedIds={wishlisted} />

      <ProductRail title="Best Sellers" subtitle="What everyone's buying" viewAllHref="/search?sort=popular" products={bestSellers} wishlistedIds={wishlisted} />

      {recentlyViewed.length > 0 && (
        <ProductRail title="Recently Viewed" products={recentlyViewed} wishlistedIds={wishlisted} />
      )}

      <ProductRail title="Picked For You" subtitle="Recommended based on your activity" products={recommended} wishlistedIds={wishlisted} />

      <ProductRail title="New Arrivals" viewAllHref="/search?sort=newest" products={newArrivals} wishlistedIds={wishlisted} />

      <SellerCta />

      <TrustSection />
    </div>
  );
}
