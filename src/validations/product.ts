import { z } from "zod";

// Note: fields here intentionally avoid zod's `.default()`. react-hook-form's
// zodResolver types itself against the schema's *input* type, but
// `useForm<T>()` is bound to `z.infer<T>` (the *output* type) below — with
// `.default()` those two diverge (the field becomes optional on input, non-
// optional on output) and TypeScript rejects the resolver. Defaults are
// supplied via each form's `defaultValues` instead.

export const productVariantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(1, "SKU is required").max(64),
  name: z.string().trim().min(1, "Variant name is required").max(120),
  options: z.record(z.string(), z.string()),
  price: z.number().positive().optional(),
  imageUrl: z.string().optional(),
  weight: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative(),
});

export const productImageSchema = z.object({
  url: z.string().min(1),
  altText: z.string().optional(),
  isPrimary: z.boolean(),
});

export const productFormSchema = z.object({
  // Step 1 — basic info
  name: z.string().trim().min(3, "Name is too short").max(200),
  categoryId: z.string().min(1, "Choose a category"),
  brandId: z.string().optional().or(z.literal("")),
  description: z.string().trim().min(20, "Description is too short"),
  shortDescription: z.string().trim().max(300).optional().or(z.literal("")),
  tags: z.array(z.string()),

  // Step 2 — images
  images: z.array(productImageSchema).min(1, "Add at least one image"),

  // Step 3 — pricing
  price: z.number().positive("Price must be greater than 0"),
  compareAtPrice: z.number().positive().optional(),
  costPrice: z.number().nonnegative().optional(),

  // Step 4 — inventory
  sku: z.string().trim().min(1, "SKU is required").max(64),
  stock: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative(),

  // Step 5 — variants (optional)
  hasVariants: z.boolean(),
  variants: z.array(productVariantSchema),

  // Step 6 — shipping
  weight: z.number().nonnegative().optional(),
  dimensions: z
    .object({ length: z.number().nonnegative(), width: z.number().nonnegative(), height: z.number().nonnegative() })
    .optional(),
  warranty: z.string().trim().max(200).optional().or(z.literal("")),
  returnPolicy: z.string().trim().max(500).optional().or(z.literal("")),
  shippingInfo: z.string().trim().max(500).optional().or(z.literal("")),

  // Step 7 — SEO
  seoTitle: z.string().trim().max(160).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(300).optional().or(z.literal("")),

  // Step 8 — review & publish
  isFeatured: z.boolean(),
})
  .refine((data) => !data.compareAtPrice || data.compareAtPrice > data.price, {
    message: "Compare-at price must be greater than the selling price",
    path: ["compareAtPrice"],
  })
  .refine((data) => !data.hasVariants || data.variants.length > 0, {
    message: "Add at least one variant, or turn off variants",
    path: ["variants"],
  });

export type ProductFormInput = z.infer<typeof productFormSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  parentId: z.string().optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  imageUrl: z.string().optional().or(z.literal("")),
  seoTitle: z.string().trim().max(160).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(300).optional().or(z.literal("")),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});

export type CategoryFormInput = z.infer<typeof categorySchema>;

export const brandSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  logoUrl: z.string().optional().or(z.literal("")),
  isActive: z.boolean(),
});

export type BrandFormInput = z.infer<typeof brandSchema>;
