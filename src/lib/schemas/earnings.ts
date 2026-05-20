import { z } from 'zod';

export const markOrdersPayoutPaidSchema = z.object({
  orderIds: z.array(z.uuid()).min(1).max(500),
  payoutReference: z.string().trim().min(3).max(200),
});

export type MarkOrdersPayoutPaidInput = z.infer<typeof markOrdersPayoutPaidSchema>;
