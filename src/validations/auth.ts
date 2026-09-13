import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerCustomerSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(100),
    email: z.email("Enter a valid email address"),
    phone: z
      .string()
      .trim()
      .min(7, "Enter a valid phone number")
      .max(20)
      .optional()
      .or(z.literal("")),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterCustomerInput = z.infer<typeof registerCustomerSchema>;

export const registerSellerSchema = z
  .object({
    // Step 1 — account
    name: z.string().trim().min(2, "Name is too short").max(100),
    email: z.email("Enter a valid email address"),
    phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
    password: passwordSchema,
    confirmPassword: z.string(),
    // Step 2 — store
    storeName: z.string().trim().min(2, "Store name is too short").max(100),
    storeDescription: z.string().trim().max(1000).optional().or(z.literal("")),
    // Step 3 — business
    businessName: z.string().trim().min(2, "Business name is too short").max(150),
    businessType: z.string().trim().max(100).optional().or(z.literal("")),
    taxId: z.string().trim().max(50).optional().or(z.literal("")),
    city: z.string().trim().min(2, "City is required").max(100),
    country: z.string().trim().min(2, "Country is required").max(100),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterSellerInput = z.infer<typeof registerSellerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
