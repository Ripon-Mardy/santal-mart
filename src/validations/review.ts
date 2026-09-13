import { z } from "zod";

export const reviewFormSchema = z.object({
  orderItemId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  comment: z.string().trim().min(10, "Please write at least 10 characters").max(2000),
  images: z.array(z.string()).max(5).default([]),
});

export const sellerReviewFormSchema = z.object({
  orderId: z.string().min(1),
  productQualityRating: z.number().int().min(1).max(5),
  deliveryRating: z.number().int().min(1).max(5),
  serviceRating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const returnRequestSchema = z.object({
  orderItemId: z.string().min(1),
  reason: z.enum(["WRONG_PRODUCT", "DAMAGED", "NOT_AS_DESCRIBED", "MISSING_ITEM", "OTHER"]),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  images: z.array(z.string()).max(5).default([]),
});
