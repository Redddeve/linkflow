import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

type CommissionStatus = Database['public']['Enums']['commission_status'];

export interface CommissionsListFilters {
  sourcerId?: string;
  status?: CommissionStatus;
}

export type CommissionRow = {
  id: string;
  order_id: string;
  site_id: string;
  sourcer_id: string;
  amount_cents: number;
  status: CommissionStatus;
  accrued_at: string;
  paid_at: string | null;
  payout_reference: string | null;
  retry_count: number;
};

export async function fetchCommissionsList(
  filters: CommissionsListFilters,
): Promise<CommissionRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from('commissions')
    .select(
      'id, order_id, site_id, sourcer_id, amount_cents, status, accrued_at, paid_at, payout_reference, retry_count',
    )
    .order('accrued_at', { ascending: false });

  if (filters.sourcerId) query = query.eq('sourcer_id', filters.sourcerId);
  if (filters.status) query = query.eq('status', filters.status);

  const { data } = await query;
  return (data ?? []) as CommissionRow[];
}

export async function fetchCommissionTotals(
  sourcerId?: string,
): Promise<{ status: CommissionStatus; amount_cents: number }[]> {
  const supabase = await createClient();
  let query = supabase.from('commissions').select('status, amount_cents');
  if (sourcerId) query = query.eq('sourcer_id', sourcerId);
  const { data } = await query;
  return data ?? [];
}

export async function sumPayableCommissions(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('commissions')
    .select('amount_cents')
    .eq('status', 'PAYABLE');
  return (data ?? []).reduce((sum, c) => sum + (c.amount_cents ?? 0), 0);
}
