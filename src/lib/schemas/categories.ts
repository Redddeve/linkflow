import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer').trim(),
});

export const editCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer').trim(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type EditCategoryInput = z.infer<typeof editCategorySchema>;
