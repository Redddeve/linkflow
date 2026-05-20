import { z } from 'zod';

export const updateProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  avatar: z.string().nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
