"use client";

import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { toggleWishlist } from "@/features/wishlist/actions";

export function WishlistButton({ productId, initialInWishlist = false, className }: { productId: string; initialInWishlist?: boolean; className?: string }) {
  const { status } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inWishlist, setOptimistic] = useOptimistic(initialInWishlist);

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={inWishlist}
      className={cn("shrink-0", className)}
      disabled={isPending}
      onClick={() => {
        if (status !== "authenticated") {
          router.push("/login");
          return;
        }
        startTransition(async () => {
          setOptimistic(!inWishlist);
          const result = await toggleWishlist(productId);
          if (!result.success) toast.error(result.message);
        });
      }}
    >
      <Heart className={cn("size-4", inWishlist && "fill-destructive text-destructive")} />
    </Button>
  );
}
