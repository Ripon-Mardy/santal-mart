"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Copy, Trash2, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteProduct, duplicateProduct, togglePublishProduct } from "@/features/products/actions";

export function ProductRowActions({ productId, isPublished, canPublish }: { productId: string; isPublished: boolean; canPublish: boolean }) {
  const [, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon"><MoreHorizontal className="size-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/seller/products/${productId}`}><Pencil /> Edit</Link>
        </DropdownMenuItem>
        {canPublish && (
          <DropdownMenuItem
            onClick={() =>
              startTransition(async () => {
                const result = await togglePublishProduct(productId);
                if (!result.success) toast.error(result.message);
              })
            }
          >
            {isPublished ? <EyeOff /> : <Eye />} {isPublished ? "Unpublish" : "Publish"}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() =>
            startTransition(async () => {
              const result = await duplicateProduct(productId);
              if (!result.success) toast.error(result.message);
              else toast.success("Product duplicated");
            })
          }
        >
          <Copy /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <ConfirmDialog
          trigger={
            <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          }
          title="Delete this product?"
          description="If it has past orders, it will be archived instead of deleted."
          onConfirm={() =>
            startTransition(async () => {
              const result = await deleteProduct(productId);
              if (!result.success) toast.error(result.message);
            })
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
