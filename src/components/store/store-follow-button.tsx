"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toggleStoreFollow } from "@/features/stores/actions";

export function StoreFollowButton({ storeId, initialFollowing = false }: { storeId: string; storeName?: string; initialFollowing?: boolean }) {
  const { status } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [following, setOptimistic] = useOptimistic(initialFollowing);

  return (
    <Button
      type="button"
      variant={following ? "secondary" : "outline"}
      size="sm"
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (status !== "authenticated") {
          router.push("/login");
          return;
        }
        startTransition(async () => {
          setOptimistic(!following);
          const result = await toggleStoreFollow(storeId);
          if (!result.success) toast.error(result.message);
        });
      }}
    >
      <Heart className={following ? "fill-current" : ""} />
      {following ? "Following" : "Follow"}
    </Button>
  );
}
