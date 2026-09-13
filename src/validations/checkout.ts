import { z } from "zod";

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(100),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  line1: z.string().trim().min(5, "Address is too short").max(300),
  city: z.string().trim().min(2, "City is required").max(100),
  division: z.string().trim().min(2, "Division/state is required").max(100),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().min(2).max(100),
  type: z.enum(["HOME", "OFFICE", "OTHER"]),
  isDefault: z.boolean(),
});

export type AddressInput = z.infer<typeof addressSchema>;

export const checkoutSchema = z.object({
  addressId: z.string().min(1, "Select a delivery address"),
  billingAddressId: z.string().optional(),
  paymentMethod: z.enum(["COD", "MOCK_CARD", "MOCK_WALLET"]),
  couponCode: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1).max(99),
});

export const couponFormSchema = z
  .object({
    code: z.string().trim().min(3, "Code is too short").max(30),
    description: z.string().trim().max(300).optional().or(z.literal("")),
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"]),
    value: z.number().nonnegative(),
    minOrderAmount: z.number().nonnegative().optional(),
    maxDiscount: z.number().nonnegative().optional(),
    usageLimit: z.number().int().positive().optional(),
    perUserLimit: z.number().int().positive().optional(),
    sellerId: z.string().optional(),
    categoryId: z.string().optional(),
    productId: z.string().optional(),
    startsAt: z.date(),
    endsAt: z.date(),
    isActive: z.boolean(),
  })
  .refine((data) => data.endsAt > data.startsAt, { message: "End date must be after start date", path: ["endsAt"] })
  .refine((data) => data.discountType !== "PERCENTAGE" || data.value <= 100, {
    message: "Percentage discount can't exceed 100",
    path: ["value"],
  });

export type CouponFormInput = z.infer<typeof couponFormSchema>;
