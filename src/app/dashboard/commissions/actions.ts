'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { notify } from '@/lib/notify';
import { AppError } from '@/lib/errors';
import { verifyLink } from '@/lib/verify-link';
import {
  markCommissionsPaidSchema,
  type MarkCommissionsPaidInput,
} from '@/lib/schemas/commissions';

function mapForbidden(e: unknown): never {
  if (e instanceof Error && e.message.startsWith('FORBIDDEN')) {
    throw new AppError('FORBIDDEN', 'You do not have permission to perform this action');
  }
  throw e;
}

function getWindowDays(): number {
  const raw = process.env.COMMISSION_WINDOW_DAYS;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 30;
}

export async function markCommissionsPaid(input: MarkCommissionsPaidInput): Promise<void> {
  await requireRole(['Admin']).catch(mapForbidden);

  const parsed = markCommissionsPaidSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const { commissionIds, payoutReference } = parsed.data;
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from('commissions')
    .update({ status: 'PAID', paid_at: now, payout_reference: payoutReference })
    .in('id', commissionIds)
    .eq('status', 'PAYABLE')
    .select('id, sourcer_id, amount_cents, order_id');

  if (error) throw new Error(error.message);

  const rows = (updated ?? []) as Array<{
    id: string;
    sourcer_id: string;
    amount_cents: number;
    order_id: string;
  }>;

  for (const row of rows) {
    await recordAudit({
      entityType: 'commission',
      entityId: row.id,
      action: 'commission.paid',
      before: { status: 'PAYABLE' },
      after: { status: 'PAID', payout_reference: payoutReference, paid_at: now },
    });
    await notify({
      recipientId: row.sourcer_id,
      type: 'commission.paid',
      payload: {
        commissionId: row.id,
        orderId: row.order_id,
        amount_cents: row.amount_cents,
        payout_reference: payoutReference,
      },
    });
  }

  if (rows.length > 0) {
    revalidatePath('/dashboard/commissions');
  }
}

export interface PromoteResult {
  promoted: number;
  retried: number;
  reversed: number;
  errored: number;
}

interface Candidate {
  commission_id: string;
  order_id: string;
  sourcer_id: string;
  published_url: string;
  site_domain: string;
  retry_count: number;
}

type VerifyOutcome = { c: Candidate; verify: Awaited<ReturnType<typeof verifyLink>> };

const VERIFY_CONCURRENCY = 5;

async function verifyInBatches(candidates: Candidate[]): Promise<VerifyOutcome[]> {
  const results: VerifyOutcome[] = [];
  for (let i = 0; i < candidates.length; i += VERIFY_CONCURRENCY) {
    const batch = candidates.slice(i, i + VERIFY_CONCURRENCY);
    const settled = await Promise.all(
      batch.map(async (c) => ({
        c,
        verify: await verifyLink(c.published_url, { expectedHost: c.site_domain }),
      })),
    );
    results.push(...settled);
  }
  return results;
}

export async function promoteCommissions(): Promise<PromoteResult> {
  await requireRole(['Admin']).catch(mapForbidden);

  const supabase = await createClient();
  const windowDays = getWindowDays();

  const { data, error } = await supabase.rpc('promote_commissions_candidates', {
    p_window_days: windowDays,
  });

  if (error) throw new Error(error.message);

  const candidates = (data ?? []) as Candidate[];
  const result: PromoteResult = { promoted: 0, retried: 0, reversed: 0, errored: 0 };

  if (candidates.length === 0) return result;

  const outcomes = await verifyInBatches(candidates);
  let adminIds: string[] | null = null;

  for (const { c, verify } of outcomes) {
    if (verify.ok) {
      const { error: upErr } = await supabase
        .from('commissions')
        .update({ status: 'PAYABLE' })
        .eq('id', c.commission_id)
        .eq('status', 'ACCRUED');

      if (upErr) {
        result.errored++;
        continue;
      }

      result.promoted++;
      await recordAudit({
        entityType: 'commission',
        entityId: c.commission_id,
        action: 'commission.promoted',
        before: { status: 'ACCRUED' },
        after: { status: 'PAYABLE' },
      });
      await notify({
        recipientId: c.sourcer_id,
        type: 'commission.payable',
        payload: { commissionId: c.commission_id, orderId: c.order_id },
      });
      continue;
    }

    if (c.retry_count < 3) {
      const { error: upErr } = await supabase
        .from('commissions')
        .update({ retry_count: c.retry_count + 1, last_retry_at: new Date().toISOString() })
        .eq('id', c.commission_id)
        .eq('status', 'ACCRUED');

      if (upErr) {
        result.errored++;
        continue;
      }

      result.retried++;
      await recordAudit({
        entityType: 'commission',
        entityId: c.commission_id,
        action: 'commission.promotion_retry',
        after: { retry_count: c.retry_count + 1, reason: verify.reason },
      });
      continue;
    }

    // retry_count >= 3 → reverse
    const { error: upErr } = await supabase
      .from('commissions')
      .update({ status: 'REVERSED' })
      .eq('id', c.commission_id)
      .eq('status', 'ACCRUED');

    if (upErr) {
      result.errored++;
      continue;
    }

    result.reversed++;
    await recordAudit({
      entityType: 'commission',
      entityId: c.commission_id,
      action: 'commission.reversed',
      before: { status: 'ACCRUED' },
      after: { status: 'REVERSED', reason: verify.reason },
    });
    await notify({
      recipientId: c.sourcer_id,
      type: 'commission.reversed',
      payload: { commissionId: c.commission_id, orderId: c.order_id, reason: verify.reason },
    });

    // Lazy-load admin list once on first reversal
    if (adminIds === null) {
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'Admin')
        .eq('status', 'ACTIVE');
      adminIds = (admins ?? []).map((a) => a.id);
    }

    for (const adminId of adminIds) {
      await notify({
        recipientId: adminId,
        type: 'commission.reversed.escalation',
        payload: {
          commissionId: c.commission_id,
          orderId: c.order_id,
          sourcerId: c.sourcer_id,
          reason: verify.reason,
        },
      });
    }
  }

  if (result.promoted + result.retried + result.reversed > 0) {
    revalidatePath('/dashboard/commissions');
  }

  return result;
}
