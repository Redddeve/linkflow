import { z } from 'zod';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const editOrderPublishDateSchema = z.object({
  orderId: z.string().uuid(),
  publish_date: z.coerce
    .date()
    .refine((d) => d >= startOfToday(), 'Publish date must be today or later'),
});

export const cancelOrderSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export const assignCopywriterSchema = z.object({
  orderId: z.string().uuid(),
  copywriterId: z.string().uuid(),
});

export const saveOrderContentSchema = z.object({
  orderId: z.string().uuid(),
  body: z.string().max(50_000),
});

export const submitOrderContentSchema = z.object({
  orderId: z.string().uuid(),
});

export type EditOrderPublishDateInput = z.input<typeof editOrderPublishDateSchema>;
export type CancelOrderInput = z.input<typeof cancelOrderSchema>;
export type AssignCopywriterInput = z.input<typeof assignCopywriterSchema>;
export type SaveOrderContentInput = z.input<typeof saveOrderContentSchema>;
export type SubmitOrderContentInput = z.input<typeof submitOrderContentSchema>;
