"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Minus, Plus, Share2, ShoppingCart, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Price } from "@/components/shared/price";
import { WishlistButton } from "@/components/shared/wishlist-button";
import { addToCart } from "@/features/cart/actions";
import { useCartStore } from "@/stores/cart-store";
import { cn } from "cn";

export type VariantOption = {
  id: string;
  name: string;
  options: Record<string, string>;
  price: number | null;
  available: number;
};

export function ProductBuyBox({
  productId,
  productName,
  basePrice,
  compareAtPrice,
  baseAvailable,
  variants,
  inWishlist,
  sticky = false,
}: {
  productId: string;
  productName: string;
  basePrice: number;
  compareAtPrice: number | null;
  baseAvailable: number;
  variants: VariantOption[];
  inWishlist: boolean;
  sticky?: boolean;
}) {
  const router = useRouter();
  const { status } = useSession();
  const increment = useCartStore((s) => s.increment);
  const [isPending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(1);

  const axes = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const v of variants) {
      for (const [axis, value] of Object.entries(v.options)) {
        if (!map.has(axis)) map.set(axis, new Set());
        map.get(axis)!.add(value);
      }
    }
    return [...map.entries()].map(([axis, values]) => ({ axis, values: [...values] }));
  }, [variants]);

  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (variants[0]) Object.assign(initial, variants[0].options);
    return initial;
  });

  const selectedVariant = useMemo(() => {
    if (variants.length === 0) return null;
    return variants.find((v) => Object.entries(v.options).every(([k, val]) => selected[k] === val)) ?? null;
  }, [variants, selected]);

  const price = selectedVariant?.price ?? basePrice;
  const available = variants.length > 0 ? (selectedVariant?.available ?? 0) : baseAvailable;
  const outOfStock = available <= 0;
  const needsSelection = variants.length > 0 && !selectedVariant;

  function handleAddToCart(redirectToCheckout: boolean) {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=/products`);
      return;
    }
    if (needsSelection) {
      toast.error("Please select all options first");
      return;
    }
    startTransition(async () => {
      const result = await addToCart({ productId, variantId: selectedVariant?.id, quantity });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      increment(quantity);
      if (redirectToCheckout) {
        router.push("/checkout");
      } else {
        toast.success(`Added ${quantity} × ${productName} to cart`);
      }
    });
  }

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: productName, url });
      } catch {
        // user cancelled — ignore
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  }

  return (
    <div className={cn("space-y-4", sticky && "flex items-center gap-3 space-y-0")}>
      {!sticky && <Price amount={price} compareAtAmount={compareAtPrice} size="xl" />}

      {!sticky &&
        axes.map(({ axis, values }) => (
          <div key={axis}>
            <p className="mb-1.5 text-sm font-medium">{axis}</p>
            <div className="flex flex-wrap gap-2">
              {values.map((value) => {
                const isActive = selected[axis] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelected((s) => ({ ...s, [axis]: value }))}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors",
                      isActive ? "border-primary bg-primary/10 font-medium text-primary" : "hover:border-foreground/40"
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

      {!sticky && (
        <p className={cn("text-sm", outOfStock ? "text-destructive" : "text-emerald-600")}>
          {needsSelection ? "Select options to see availability" : outOfStock ? "Out of stock" : `In stock (${available} available)`}
        </p>
      )}

      <div className="flex items-center gap-3">
        {!sticky && (
          <div className="flex items-center rounded-md border">
            <Button type="button" variant="ghost" size="icon" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}>
              <Minus className="size-4" />
            </Button>
            <span className="w-8 text-center text-sm tabular-nums">{quantity}</span>
            <Button type="button" variant="ghost" size="icon" onClick={() => setQuantity((q) => Math.min(available || 1, q + 1))} disabled={quantity >= available}>
              <Plus className="size-4" />
            </Button>
          </div>
        )}

        <Button className="flex-1" variant="outline" disabled={isPending || outOfStock || needsSelection} onClick={() => handleAddToCart(false)}>
          <ShoppingCart /> Add to Cart
        </Button>
        <Button className="flex-1" disabled={isPending || outOfStock || needsSelection} onClick={() => handleAddToCart(true)}>
          <Zap /> Buy Now
        </Button>
        {!sticky && (
          <>
            <WishlistButton productId={productId} initialInWishlist={inWishlist} />
            <Button type="button" variant="outline" size="icon" onClick={handleShare} aria-label="Share">
              <Share2 className="size-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
