import { createClient } from '@/lib/supabase/server';
import type { BillingMonth } from '@/lib/billing';

export interface EarningsFilters {
  month: BillingMonth;
  sourcerId?: string;
}

export interface EarningsTotals {
  earningsCents: number;
  ordersCount: number;
}

export async function fetchEarningsTotals(
  filters: EarningsFilters,
): Promise<EarningsTotals> {
  const supabase = await createClient();
  let query = supabase
    .from('orders')
    .select('price_cents, sites!inner(sourcer_id)')
    .eq('billing_month', filters.month)
    .not('published_at', 'is', null);

  if (filters.sourcerId) {
    query = query.eq('sites.sourcer_id', filters.sourcerId);
  }

  const { data } = await query;
  const rows = (data ?? []) as { price_cents: number }[];
  return {
    earningsCents: rows.reduce((sum, r) => sum + (r.price_cents ?? 0), 0),
    ordersCount: rows.length,
  };
}
