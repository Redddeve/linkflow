import { z } from 'zod';

export const markCommissionsPaidSchema = z.object({
  commissionIds: z.array(z.uuid()).min(1, 'At least one commission is required').max(500, 'Too many commissions in one batch'),
  payoutReference: z.string().trim().min(3, 'Payout reference must be at least 3 characters').max(200),
});

export const promoteCommissionsSchema = z.object({}).optional();

export type MarkCommissionsPaidInput = z.input<typeof markCommissionsPaidSchema>;
