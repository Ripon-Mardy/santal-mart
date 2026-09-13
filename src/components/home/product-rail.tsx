import { ProductCard, type ProductCardData } from "@/components/shared/product-card";
import { SectionHeading } from "@/components/home/section-heading";

export function ProductRail({
  title,
  subtitle,
  viewAllHref,
  products,
  wishlistedIds,
}: {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  products: ProductCardData[];
  wishlistedIds?: Set<string>;
}) {
  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <SectionHeading title={title} subtitle={subtitle} viewAllHref={viewAllHref} />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-5">
        {products.map((product) => (
          <div key={product.id} className="w-[46%] shrink-0 sm:w-auto">
            <ProductCard product={product} inWishlist={wishlistedIds?.has(product.id)} />
          </div>
        ))}
      </div>
    </section>
  );
}
