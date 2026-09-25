import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().optional(),
  displayName: z.string().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateProfileSchema = z.object({
  email: z.string().email("Enter a valid email address").optional(),
  fullName: z.string().optional(),
  displayName: z.string().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
