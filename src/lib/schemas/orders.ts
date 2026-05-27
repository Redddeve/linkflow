import { z } from 'zod';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const editOrderPublishDateSchema = z.object({
  orderId: z.uuid(),
  publish_date: z.coerce
    .date()
    .refine((d) => d >= startOfToday(), 'Publish date must be today or later'),
});

export const cancelOrderSchema = z.object({
  orderId: z.uuid(),
  reason: z.string().max(500).optional(),
});

export const assignCopywriterSchema = z.object({
  orderId: z.uuid(),
  copywriterId: z.uuid(),
});

export const saveOrderContentSchema = z.object({
  orderId: z.uuid(),
  body: z.string().max(50_000),
});

export const submitOrderContentSchema = z.object({
  orderId: z.uuid(),
  body: z.string().min(50, 'Content must be at least 50 characters').max(50_000),
});

export const approveOrderSchema = z.object({
  orderId: z.uuid(),
});

export const rejectOrderSchema = z.object({
  orderId: z.uuid(),
  comment: z
    .string()
    .min(20, 'Comment must be at least 20 characters')
    .max(2000),
});

export const addCommentSchema = z.object({
  orderId: z.uuid(),
  text: z.string().min(1).max(2000),
});

export const publishOrderSchema = z.object({
  orderId: z.uuid(),
  published_url: z.string().refine((v) => {
    try {
      return new URL(v).protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Must be a valid HTTPS URL'),
  publish_date: z.coerce.date(),
});

export type EditOrderPublishDateInput = z.input<
  typeof editOrderPublishDateSchema
>;
export type CancelOrderInput = z.input<typeof cancelOrderSchema>;
export type AssignCopywriterInput = z.input<typeof assignCopywriterSchema>;
export type SaveOrderContentInput = z.input<typeof saveOrderContentSchema>;
export type SubmitOrderContentInput = z.input<typeof submitOrderContentSchema>;
export type ApproveOrderInput = z.input<typeof approveOrderSchema>;
export type RejectOrderInput = z.input<typeof rejectOrderSchema>;
export type AddCommentInput = z.input<typeof addCommentSchema>;
export type PublishOrderInput = z.input<typeof publishOrderSchema>;
