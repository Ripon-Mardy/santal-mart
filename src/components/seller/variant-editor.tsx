"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { z } from "zod";
import type { productVariantSchema } from "@/validations/product";

export type VariantRow = z.infer<typeof productVariantSchema>;

export function VariantEditor({ variants, onChange }: { variants: VariantRow[]; onChange: (variants: VariantRow[]) => void }) {
  function update(index: number, patch: Partial<VariantRow>) {
    onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function updateOption(index: number, key: string, value: string) {
    onChange(variants.map((v, i) => (i === index ? { ...v, options: { ...v.options, [key]: value } } : v)));
  }

  return (
    <div className="space-y-3">
      {variants.map((variant, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-6">
          <div className="col-span-2 sm:col-span-1">
            <Label className="mb-1 text-xs">Color</Label>
            <Input value={variant.options.Color ?? ""} onChange={(e) => updateOption(i, "Color", e.target.value)} placeholder="e.g. Black" />
          </div>
          <div>
            <Label className="mb-1 text-xs">Size</Label>
            <Input value={variant.options.Size ?? ""} onChange={(e) => updateOption(i, "Size", e.target.value)} placeholder="e.g. M" />
          </div>
          <div>
            <Label className="mb-1 text-xs">SKU</Label>
            <Input value={variant.sku} onChange={(e) => update(i, { sku: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 text-xs">Price override</Label>
            <Input type="number" value={variant.price ?? ""} onChange={(e) => update(i, { price: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div>
            <Label className="mb-1 text-xs">Stock</Label>
            <Input type="number" value={variant.stock} onChange={(e) => update(i, { stock: Number(e.target.value) })} />
          </div>
          <div className="flex items-end">
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange(variants.filter((_, idx) => idx !== i))}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...variants,
            { sku: "", name: "", options: {}, stock: 0 },
          ])
        }
      >
        <Plus /> Add Variant
      </Button>
    </div>
  );
}
