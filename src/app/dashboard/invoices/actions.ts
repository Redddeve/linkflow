'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { notify } from '@/lib/notify';
import { AppError } from '@/lib/errors';
import { z } from 'zod';
import {
  sendInvoiceSchema,
  markInvoicePaidSchema,
  reassignOrderBillingMonthSchema,
  reassignOrdersSchema,
  generateInvoicesSchema,
  type SendInvoiceInput,
  type MarkInvoicePaidInput,
  type ReassignOrderBillingMonthInput,
  type ReassignOrdersInput,
  type GenerateInvoicesInput,
} from '@/lib/schemas/invoices';

function mapForbidden(e: unknown): never {
  if (e instanceof Error && e.message.startsWith('FORBIDDEN')) {
    throw new AppError('FORBIDDEN', 'You do not have permission to perform this action');
  }
  throw e;
}

// Postgres error code → AppError mapping for our RPCs.
function mapRpcError(message: string): AppError {
  if (message.includes('forbidden')) {
    return new AppError('FORBIDDEN', 'You do not have permission to perform this action');
  }
  if (message.includes('order_not_found')) {
    return new AppError('NOT_FOUND', 'Order not found');
  }
  if (message.includes('order_not_published')) {
    return new AppError('VALIDATION', 'Order must be Published to reassign its billing month');
  }
  if (message.includes('order_not_invoiced')) {
    return new AppError('VALIDATION', 'Order is not yet attached to an invoice');
  }
  if (message.includes('source_invoice_not_draft')) {
    return new AppError('VALIDATION', 'Only Draft invoices can have orders reassigned');
  }
  return new AppError('VALIDATION', message);
}

// ── sendInvoice ────────────────────────────────────────────────────────────────

export async function sendInvoice(input: SendInvoiceInput): Promise<void> {
  const actor = await requireRole(['Manager', 'Admin']).catch(mapForbidden);

  const parsed = sendInvoiceSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);
  const { invoiceId } = parsed.data;

  const supabase = await createClient();

  // Load invoice + order count so we can refuse to send empty / zero-total Drafts.
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('id, status, client_id, billing_month, total_price_cents')
    .eq('id', invoiceId)
    .single();

  if (error || !invoice) throw new AppError('NOT_FOUND', 'Invoice not found');
  if (invoice.status !== 'Draft') {
    throw new AppError('VALIDATION', `Cannot send an invoice with status "${invoice.status}"`);
  }
  if (invoice.total_price_cents <= 0) {
    throw new AppError('VALIDATION', 'Cannot send an empty invoice ($0 total)');
  }

  const { count: orderCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('invoice_id', invoiceId);

  if (!orderCount || orderCount === 0) {
    throw new AppError('VALIDATION', 'Cannot send an invoice with no attached orders');
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('invoices')
    .update({ status: 'Sent', sent_at: now, sent_by_id: actor.id })
    .eq('id', invoiceId)
    .eq('status', 'Draft');

  if (updateError) throw new Error(updateError.message);

  await recordAudit({
    entityType: 'invoice',
    entityId: invoiceId,
    action: 'invoice.sent',
    before: { status: 'Draft' },
    after: { status: 'Sent' },
  });

  await notify({
    recipientId: invoice.client_id,
    type: 'invoice.sent',
    payload: { invoiceId, billing_month: invoice.billing_month },
  });

  revalidatePath('/dashboard/invoices');
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
}

// ── markInvoicePaid ────────────────────────────────────────────────────────────

export async function markInvoicePaid(input: MarkInvoicePaidInput): Promise<void> {
  const actor = await requireRole(['Admin']).catch(mapForbidden);

  const parsed = markInvoicePaidSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);
  const { invoiceId } = parsed.data;

  const supabase = await createClient();
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('id, status, client_id, billing_month')
    .eq('id', invoiceId)
    .single();

  if (error || !invoice) throw new AppError('NOT_FOUND', 'Invoice not found');
  if (invoice.status !== 'Sent') {
    throw new AppError('VALIDATION', `Cannot mark as paid an invoice with status "${invoice.status}"`);
  }

  const now = new Date().toISOString();
  // The before-update trigger (enforce_invoice_paid_admin_only) will reject the
  // transition if our role check above ever drifts out of sync with the DB.
  const { error: updateError } = await supabase
    .from('invoices')
    .update({ status: 'Paid', marked_as_paid_at: now, marked_as_paid_by_id: actor.id })
    .eq('id', invoiceId)
    .eq('status', 'Sent');

  if (updateError) throw new Error(updateError.message);

  await recordAudit({
    entityType: 'invoice',
    entityId: invoiceId,
    action: 'invoice.paid',
    before: { status: 'Sent' },
    after: { status: 'Paid' },
  });

  await notify({
    recipientId: invoice.client_id,
    type: 'invoice.paid',
    payload: { invoiceId, billing_month: invoice.billing_month },
  });

  revalidatePath('/dashboard/invoices');
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
}

// ── reassignOrders (batch — FR-INV-5) ─────────────────────────────────────────

interface ReassignResult {
  sources_touched: string[];
  targets_touched: string[];
}

export async function reassignOrders(input: ReassignOrdersInput): Promise<ReassignResult> {
  await requireRole(['Manager', 'Admin']).catch(mapForbidden);

  const parsed = reassignOrdersSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);
  const { changes } = parsed.data;

  if (changes.length === 0) {
    return { sources_touched: [], targets_touched: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('reassign_order_billing_months', {
    p_changes: changes.map((c: { orderId: string; billing_month: string }) => ({
      order_id: c.orderId,
      new_billing_month: c.billing_month,
    })),
  });

  if (error) throw mapRpcError(error.message);

  const result = (data ?? { sources_touched: [], targets_touched: [] }) as unknown as ReassignResult;

  await recordAudit({
    entityType: 'invoice',
    entityId: result.targets_touched[0] ?? result.sources_touched[0] ?? 'batch',
    action: 'invoice.orders_reassigned',
    after: {
      order_count: changes.length,
      sources_touched: result.sources_touched,
      targets_touched: result.targets_touched,
    },
  });

  revalidatePath('/dashboard/invoices');
  for (const id of [...result.sources_touched, ...result.targets_touched]) {
    revalidatePath(`/dashboard/invoices/${id}`);
  }

  return result;
}

/**
 * Legacy single-order wrapper, kept for callers that only want to move one
 * order. New UI flows should call `reassignOrders` with a batch.
 */
export async function reassignOrderBillingMonth(
  input: ReassignOrderBillingMonthInput,
): Promise<void> {
  const parsed = reassignOrderBillingMonthSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);
  await reassignOrders({
    changes: [{ orderId: parsed.data.orderId, billing_month: parsed.data.billing_month }],
  });
}

// ── generateInvoicesForMonth ───────────────────────────────────────────────────

interface GenerateResult {
  created: number;
  updated: number;
}

const rpcGenerateResultSchema = z.object({
  created: z.number(),
  updated: z.number(),
});

export async function generateInvoicesForMonth(
  input: GenerateInvoicesInput,
): Promise<GenerateResult> {
  await requireRole(['Admin']).catch(mapForbidden);

  const parsed = generateInvoicesSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);
  const { billing_month: billingMonth } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('generate_invoices_for_month', {
    p_billing_month: billingMonth,
  });

  if (error) throw mapRpcError(error.message);

  const result = rpcGenerateResultSchema.parse(data ?? { created: 0, updated: 0 });

  if (result.created > 0 || result.updated > 0) {
    await recordAudit({
      entityType: 'invoice',
      entityId: `batch:${billingMonth}`,
      action: 'invoice.generated_batch',
      after: { billing_month: billingMonth, ...result },
    });
  }

  // Notify clients of newly-created Draft invoices. We must look these up after
  // the RPC because the function returns counts, not ids.
  if (result.created > 0) {
    const { data: fresh } = await supabase
      .from('invoices')
      .select('id, client_id, total_price_cents')
      .eq('billing_month', billingMonth)
      .eq('status', 'Draft');

    for (const inv of fresh ?? []) {
      await notify({
        recipientId: inv.client_id,
        type: 'invoice.generated',
        payload: {
          invoiceId: inv.id,
          billing_month: billingMonth,
          total_price_cents: inv.total_price_cents,
        },
      });
    }
  }

  if (result.created > 0 || result.updated > 0) {
    revalidatePath('/dashboard/invoices');
  }

  return result;
}
