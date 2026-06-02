'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/features/auth';
import { recordAudit } from '@/lib/features/audit';
import { notify } from '@/lib/features/notify';
import type { ActionResult } from '@/lib/errors';
import {
  markOrdersPayoutPaidSchema,
  setOrderPayoutPaidSchema,
  type MarkOrdersPayoutPaidInput,
  type SetOrderPayoutPaidInput,
} from '@/lib/schemas/earnings';

export async function markOrdersPayoutPaid(
  input: MarkOrdersPayoutPaidInput,
): Promise<ActionResult<{ updated: number }>> {
  try {
    await requireRole(['Admin']);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('FORBIDDEN')) {
      return {
        success: false,
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action',
      };
    }
    throw e;
  }

  const parsed = markOrdersPayoutPaidSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: 'VALIDATION',
      message: parsed.error.issues[0].message,
    };
  }

  const { orderIds, payoutReference } = parsed.data;
  const supabase = await createClient();
  const paidAt = new Date().toISOString();

  // Snapshot the rows being marked paid so we know recipients (sourcers) and amounts
  // and to guard against marking already-paid rows.
  const { data: rows, error: fetchError } = await supabase
    .from('orders')
    .select(
      'id, site_id, sourcer_payout_cents, sourcer_paid_at, sites!inner(sourcer_id)',
    )
    .in('id', orderIds)
    .is('sourcer_paid_at', null)
    .not('sourcer_payout_cents', 'is', null);

  if (fetchError) {
    return { success: false, code: 'UNKNOWN', message: fetchError.message };
  }

  type Row = {
    id: string;
    site_id: string;
    sourcer_payout_cents: number | null;
    sourcer_paid_at: string | null;
    sites:
      | { sourcer_id: string | null }
      | { sourcer_id: string | null }[]
      | null;
  };
  const eligible = ((rows ?? []) as unknown as Row[]).filter((r) => {
    const sites = r.sites;
    const sourcerId = Array.isArray(sites)
      ? sites[0]?.sourcer_id
      : sites?.sourcer_id;
    return sourcerId != null;
  });

  if (eligible.length === 0) return { success: true, data: { updated: 0 } };

  const eligibleIds = eligible.map((r) => r.id);
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      sourcer_paid_at: paidAt,
      sourcer_payout_reference: payoutReference,
    })
    .in('id', eligibleIds)
    .is('sourcer_paid_at', null);

  if (updateError) {
    return { success: false, code: 'UNKNOWN', message: updateError.message };
  }

  await Promise.all(
    eligible.map((r) => {
      const sites = r.sites;
      const sourcerId = (
        Array.isArray(sites) ? sites[0]?.sourcer_id : sites?.sourcer_id
      ) as string;
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
  return { success: true, data: { updated: eligible.length } };
}

export async function setOrderPayoutPaid(
  input: SetOrderPayoutPaidInput,
): Promise<ActionResult<{ paid: boolean }>> {
  try {
    await requireRole(['Admin']);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('FORBIDDEN')) {
      return {
        success: false,
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action',
      };
    }
    throw e;
  }

  const parsed = setOrderPayoutPaidSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: 'VALIDATION',
      message: parsed.error.issues[0].message,
    };
  }

  const supabase = await createClient();
  const { orderId } = parsed.data;

  const { data: row, error: fetchError } = await supabase
    .from('orders')
    .select(
      'id, sourcer_payout_cents, sourcer_paid_at, sourcer_payout_reference, sites!inner(sourcer_id)',
    )
    .eq('id', orderId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, code: 'UNKNOWN', message: fetchError.message };
  }
  if (!row) {
    return { success: false, code: 'NOT_FOUND', message: 'Order not found' };
  }

  type Row = {
    id: string;
    sourcer_payout_cents: number | null;
    sourcer_paid_at: string | null;
    sourcer_payout_reference: string | null;
    sites:
      | { sourcer_id: string | null }
      | { sourcer_id: string | null }[]
      | null;
  };
  const r = row as unknown as Row;
  const sourcerId = (
    Array.isArray(r.sites) ? r.sites[0]?.sourcer_id : r.sites?.sourcer_id
  ) as string | null | undefined;

  if (!sourcerId || r.sourcer_payout_cents == null) {
    return {
      success: false,
      code: 'VALIDATION',
      message: 'Order has no sourcer payout to update',
    };
  }

  const before = {
    sourcer_paid_at: r.sourcer_paid_at,
    sourcer_payout_reference: r.sourcer_payout_reference,
  };

  if (parsed.data.paid) {
    const paidAt = new Date().toISOString();
    const payoutReference = parsed.data.payoutReference;
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        sourcer_paid_at: paidAt,
        sourcer_payout_reference: payoutReference,
      })
      .eq('id', orderId);

    if (updateError) {
      return { success: false, code: 'UNKNOWN', message: updateError.message };
    }

    await Promise.all([
      recordAudit({
        entityType: 'order',
        entityId: orderId,
        action: 'order.payout_marked_paid',
        before,
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
          orderId,
          amount_cents: r.sourcer_payout_cents,
          payout_reference: payoutReference,
        },
      }),
    ]);
  } else {
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        sourcer_paid_at: null,
        sourcer_payout_reference: null,
      })
      .eq('id', orderId);

    if (updateError) {
      return { success: false, code: 'UNKNOWN', message: updateError.message };
    }

    await recordAudit({
      entityType: 'order',
      entityId: orderId,
      action: 'order.payout_marked_unpaid',
      before,
      after: {
        sourcer_paid_at: null,
        sourcer_payout_reference: null,
        sourcer_payout_cents: r.sourcer_payout_cents,
      },
    });
  }

  revalidatePath('/dashboard/earnings');
  revalidatePath(`/dashboard/orders/${orderId}`);
  return { success: true, data: { paid: parsed.data.paid } };
}
