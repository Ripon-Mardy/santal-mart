import { z } from "zod";

import { passwordSchema } from "@/validations/auth";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
