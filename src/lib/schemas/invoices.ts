import { z } from 'zod';
import { isValidBillingMonth } from '@/lib/billing';

const billingMonth = z
  .string()
  .refine(isValidBillingMonth, 'Billing month must be the first day of a calendar month (YYYY-MM-01)');

export const sendInvoiceSchema = z.object({
  invoiceId: z.uuid(),
});

export const markInvoicePaidSchema = z.object({
  invoiceId: z.uuid(),
});

export const reassignOrderBillingMonthSchema = z.object({
  orderId: z.uuid(),
  billing_month: billingMonth,
});

export const reassignOrdersSchema = z.object({
  changes: z
    .array(
      z.object({
        orderId: z.uuid(),
        billing_month: billingMonth,
      }),
    )
    .min(1, 'At least one change is required')
    .max(500, 'Too many changes in one batch'),
});

export const generateInvoicesSchema = z.object({
  billing_month: billingMonth,
});

export type SendInvoiceInput = z.input<typeof sendInvoiceSchema>;
export type MarkInvoicePaidInput = z.input<typeof markInvoicePaidSchema>;
export type ReassignOrderBillingMonthInput = z.input<typeof reassignOrderBillingMonthSchema>;
export type ReassignOrdersInput = z.input<typeof reassignOrdersSchema>;
export type GenerateInvoicesInput = z.input<typeof generateInvoicesSchema>;
