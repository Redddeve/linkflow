import { z } from 'zod';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const addCartItemSchema = z.object({
  siteId: z.uuid(),
});

export const removeCartItemSchema = z.object({
  cartItemId: z.uuid(),
});

export const updateCartItemSchema = z.object({
  cartItemId: z.uuid(),
  publish_date: z.coerce
    .date()
    .refine((d) => d >= startOfToday(), 'Publish date must be today or later'),
});

export type AddCartItemInput = z.input<typeof addCartItemSchema>;
export type RemoveCartItemInput = z.input<typeof removeCartItemSchema>;
export type UpdateCartItemInput = z.input<typeof updateCartItemSchema>;
