'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { notify } from '@/lib/notify';
import { AppError } from '@/lib/errors';
import {
  markOrdersPayoutPaidSchema,
  type MarkOrdersPayoutPaidInput,
} from '@/lib/schemas/earnings';

function mapForbidden(e: unknown): never {
  if (e instanceof Error && e.message.startsWith('FORBIDDEN')) {
    throw new AppError('FORBIDDEN', 'You do not have permission to perform this action');
  }
  throw e;
}

export async function markOrdersPayoutPaid(
  input: MarkOrdersPayoutPaidInput,
): Promise<{ updated: number }> {
  await requireRole(['Admin']).catch(mapForbidden);

  const parsed = markOrdersPayoutPaidSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const { orderIds, payoutReference } = parsed.data;
  const supabase = await createClient();
  const paidAt = new Date().toISOString();

  // Snapshot the rows being marked paid so we know recipients (sourcers) and amounts
  // and to guard against marking already-paid rows.
  const { data: rows, error: fetchError } = await supabase
    .from('orders')
    .select('id, site_id, sourcer_payout_cents, sourcer_paid_at, sites!inner(sourcer_id)')
    .in('id', orderIds)
    .is('sourcer_paid_at', null)
    .not('sourcer_payout_cents', 'is', null);

  if (fetchError) throw new Error(fetchError.message);

  type Row = {
    id: string;
    site_id: string;
    sourcer_payout_cents: number | null;
    sourcer_paid_at: string | null;
    sites: { sourcer_id: string | null } | { sourcer_id: string | null }[] | null;
  };
  const eligible = ((rows ?? []) as unknown as Row[]).filter((r) => {
    const sites = r.sites;
    const sourcerId = Array.isArray(sites) ? sites[0]?.sourcer_id : sites?.sourcer_id;
    return sourcerId != null;
  });

  if (eligible.length === 0) return { updated: 0 };

  const eligibleIds = eligible.map((r) => r.id);
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      sourcer_paid_at: paidAt,
      sourcer_payout_reference: payoutReference,
    })
    .in('id', eligibleIds)
    .is('sourcer_paid_at', null);

  if (updateError) throw new Error(updateError.message);

  await Promise.all(
    eligible.map((r) => {
      const sites = r.sites;
      const sourcerId = (Array.isArray(sites) ? sites[0]?.sourcer_id : sites?.sourcer_id) as string;
      return Promise.all([
        recordAudit({
          entityType: 'order',
          entityId: r.id,
          action: 'order.payout_marked_paid',
          before: { sourcer_paid_at: null },
          after: {
            sourcer_paid_at: paidAt,
            sourcer_payout_reference: payoutReference,
            sourcer_payout_cents: r.sourcer_payout_cents,
          },
        }),
        notify({
          recipientId: sourcerId,
          type: 'order.payout_paid',
          payload: {
            orderId: r.id,
            amount_cents: r.sourcer_payout_cents,
            payout_reference: payoutReference,
          },
        }),
      ]);
    }),
  );

  revalidatePath('/dashboard/earnings');
  return { updated: eligible.length };
}
