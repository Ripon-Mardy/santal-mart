"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ImageUploader } from "@/components/shared/image-uploader";
import { VariantEditor } from "@/components/seller/variant-editor";
import { productFormSchema, type ProductFormInput } from "@/validations/product";
import { createProduct, updateProduct, uploadProductImage } from "@/features/products/actions";
import { cn } from "cn";

const STEPS = ["Basic Info", "Images", "Pricing", "Inventory", "Variants", "Shipping", "SEO", "Review & Publish"];

export type ProductFormCategory = { id: string; name: string; parentName?: string | null };
export type ProductFormBrand = { id: string; name: string };

export function ProductForm({
  categories,
  brands,
  productId,
  defaultValues,
}: {
  categories: ProductFormCategory[];
  brands: ProductFormBrand[];
  productId?: string;
  defaultValues?: Partial<ProductFormInput>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!productId;

  const form = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "", categoryId: "", brandId: "", description: "", shortDescription: "", tags: [],
      images: [], price: 0, compareAtPrice: undefined, costPrice: undefined,
      sku: "", stock: 0, lowStockThreshold: 5,
      hasVariants: false, variants: [],
      weight: undefined, warranty: "", returnPolicy: "", shippingInfo: "",
      seoTitle: "", seoDescription: "", isFeatured: false,
      ...defaultValues,
    },
  });

  // form.watch() subscribes to the whole form for the live review-step
  // summary and conditional fields below — React Compiler can't memoize
  // across it, which is expected and harmless for this small form.
  // eslint-disable-next-line react-hooks/incompatible-library
  const values = form.watch();

  async function onSubmit(data: ProductFormInput) {
    setIsSubmitting(true);
    const payload: ProductFormInput = {
      ...data,
      variants: data.variants.map((v) => ({ ...v, name: Object.values(v.options).filter(Boolean).join(" / ") || v.sku })),
    };
    const result = isEdit ? await updateProduct(productId!, payload) : await createProduct(payload);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(isEdit ? "Product updated — pending re-review if it was live" : "Product submitted for review");
    router.push("/seller/products");
  }

  async function goNext() {
    const fieldsByStep: (keyof ProductFormInput)[][] = [
      ["name", "categoryId", "description"],
      ["images"],
      ["price"],
      ["sku", "stock"],
      ["variants"],
      [],
      [],
      [],
    ];
    const valid = await form.trigger(fieldsByStep[step]);
    if (valid) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  return (
    <Form {...form}>
      <div className="mb-6 flex gap-1 overflow-x-auto">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
              i === step ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
            )}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {step === 0 && (
          <div className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input placeholder="e.g. iPhone 15" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="categoryId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.parentName ? `${c.parentName} / ${c.name}` : c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="brandId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand (optional)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select brand" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="shortDescription" render={({ field }) => (
              <FormItem><FormLabel>Short Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Full Description</FormLabel><FormControl><Textarea rows={6} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="tags" render={({ field }) => (
              <FormItem>
                <FormLabel>Tags (comma separated)</FormLabel>
                <FormControl>
                  <Input
                    defaultValue={field.value.join(", ")}
                    onBlur={(e) => field.onChange(e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
                  />
                </FormControl>
              </FormItem>
            )} />
          </div>
        )}

        {step === 1 && (
          <FormField control={form.control} name="images" render={({ field }) => (
            <FormItem>
              <FormLabel>Product Images</FormLabel>
              <ImageUploader images={field.value} onChange={field.onChange} uploadAction={uploadProductImage} />
              <FormMessage />
            </FormItem>
          )} />
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem><FormLabel>Selling Price</FormLabel><FormControl><Input type="number" value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="compareAtPrice" render={({ field }) => (
              <FormItem><FormLabel>Compare-at Price</FormLabel><FormControl><Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="costPrice" render={({ field }) => (
              <FormItem><FormLabel>Cost Price</FormLabel><FormControl><Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField control={form.control} name="sku" render={({ field }) => (
              <FormItem><FormLabel>SKU</FormLabel><FormControl><Input {...field} disabled={isEdit} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="stock" render={({ field }) => (
              <FormItem>
                <FormLabel>Stock Quantity {values.hasVariants && "(ignored — using variant stock)"}</FormLabel>
                <FormControl><Input type="number" value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} disabled={values.hasVariants} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
              <FormItem><FormLabel>Low Stock Threshold</FormLabel><FormControl><Input type="number" value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <FormField control={form.control} name="hasVariants" render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="!mt-0">This product has variants (e.g. size, color)</FormLabel>
              </FormItem>
            )} />
            {values.hasVariants && (
              <Controller
                control={form.control}
                name="variants"
                render={({ field }) => <VariantEditor variants={field.value} onChange={field.onChange} />}
              />
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <FormField control={form.control} name="weight" render={({ field }) => (
              <FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="shippingInfo" render={({ field }) => (
              <FormItem><FormLabel>Shipping Info</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="returnPolicy" render={({ field }) => (
              <FormItem><FormLabel>Return Policy</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="warranty" render={({ field }) => (
              <FormItem><FormLabel>Warranty</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <FormField control={form.control} name="seoTitle" render={({ field }) => (
              <FormItem><FormLabel>SEO Title</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="seoDescription" render={({ field }) => (
              <FormItem><FormLabel>SEO Description</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl></FormItem>
            )} />
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <FormField control={form.control} name="isFeatured" render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="!mt-0">Request featured placement</FormLabel>
              </FormItem>
            )} />
            <div className="rounded-lg border p-4 text-sm">
              <p><strong>{values.name}</strong></p>
              <p className="text-muted-foreground">{values.images.length} image(s) · {values.hasVariants ? `${values.variants.length} variant(s)` : `${values.stock} in stock`}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Submitting will send this product for admin review before it appears in the marketplace.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between border-t pt-4">
          <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext}>Continue</Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />} {isEdit ? "Save Changes" : "Submit for Review"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
