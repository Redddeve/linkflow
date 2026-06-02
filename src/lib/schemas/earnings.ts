import { z } from 'zod';

export const markOrdersPayoutPaidSchema = z.object({
  orderIds: z.array(z.uuid()).min(1).max(500),
  payoutReference: z.string().trim().min(3).max(200),
});

export type MarkOrdersPayoutPaidInput = z.infer<typeof markOrdersPayoutPaidSchema>;

export const setOrderPayoutPaidSchema = z.discriminatedUnion('paid', [
  z.object({
    orderId: z.uuid(),
    paid: z.literal(true),
    payoutReference: z.string().trim().min(3).max(200),
  }),
  z.object({
    orderId: z.uuid(),
    paid: z.literal(false),
  }),
]);

export type SetOrderPayoutPaidInput = z.infer<typeof setOrderPayoutPaidSchema>;
