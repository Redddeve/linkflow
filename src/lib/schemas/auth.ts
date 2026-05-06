import { z } from 'zod';

export const emailSchema = z.object({
  email: z.email('Enter a valid email'),
});

export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type EmailInput = z.infer<typeof emailSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
