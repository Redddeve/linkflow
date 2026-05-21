import { createClient } from '@/lib/supabase/server';
import type { BillingMonth } from '@/lib/billing';
import { commissionCents } from '@/lib/commission';

export interface EarningsFilters {
  month: BillingMonth;
  sourcerId?: string;
}

export interface EarningsTotals {
  earningsCents: number;
  paidCents: number;
  unpaidCents: number;
  commissionCents: number;
  ordersCount: number;
}

export interface EarningsListRow {
  id: string;
  site_domain: string;
  published_at: string | null;
  publish_date: string;
  price_cents: number;
  sourcer_payout_cents: number;
  commission_cents: number;
  sourcer_paid_at: string | null;
  sourcer_payout_reference: string | null;
  sourcer_id: string;
}

interface OrdersJoinedRow {
  id: string;
  site_domain: string;
  published_at: string | null;
  publish_date: string;
  price_cents: number;
  sourcer_payout_cents: number | null;
  sourcer_paid_at: string | null;
  sourcer_payout_reference: string | null;
  sites: { sourcer_id: string | null } | { sourcer_id: string | null }[] | null;
  invoices: { status: string } | { status: string }[] | null;
}

function extractSourcerId(row: OrdersJoinedRow): string | null {
  const sites = row.sites;
  if (!sites) return null;
  if (Array.isArray(sites)) return sites[0]?.sourcer_id ?? null;
  return sites.sourcer_id;
}

async function fetchPayoutRows(filters: EarningsFilters): Promise<EarningsListRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from('orders')
    .select(
      'id, site_domain, published_at, publish_date, price_cents, sourcer_payout_cents, sourcer_paid_at, sourcer_payout_reference, sites!inner(sourcer_id), invoices!inner(status)',
    )
    .eq('billing_month', filters.month)
    .not('published_at', 'is', null)
    .not('sourcer_payout_cents', 'is', null)
    .eq('invoices.status', 'Paid');

  if (filters.sourcerId) {
    query = query.eq('sites.sourcer_id', filters.sourcerId);
  } else {
    query = query.not('sites.sourcer_id', 'is', null);
  }

  const { data } = await query.order('published_at', { ascending: false });
  const rows = (data ?? []) as unknown as OrdersJoinedRow[];

  return rows
    .map((r): EarningsListRow | null => {
      const sourcerId = extractSourcerId(r);
      if (!sourcerId) return null;
      const payout = r.sourcer_payout_cents ?? 0;
      return {
        id: r.id,
        site_domain: r.site_domain,
        published_at: r.published_at,
        publish_date: r.publish_date,
        price_cents: r.price_cents,
        sourcer_payout_cents: payout,
        commission_cents: commissionCents(r.price_cents, payout),
        sourcer_paid_at: r.sourcer_paid_at,
        sourcer_payout_reference: r.sourcer_payout_reference,
        sourcer_id: sourcerId,
      };
    })
    .filter((r): r is EarningsListRow => r !== null);
}

export async function fetchEarningsTotals(
  filters: EarningsFilters,
): Promise<EarningsTotals> {
  const rows = await fetchPayoutRows(filters);
  const totals: EarningsTotals = {
    earningsCents: 0,
    paidCents: 0,
    unpaidCents: 0,
    commissionCents: 0,
    ordersCount: rows.length,
  };
  for (const r of rows) {
    totals.earningsCents += r.sourcer_payout_cents;
    totals.commissionCents += r.commission_cents;
    if (r.sourcer_paid_at) totals.paidCents += r.sourcer_payout_cents;
    else totals.unpaidCents += r.sourcer_payout_cents;
  }
  return totals;
}

export async function fetchEarningsList(
  filters: EarningsFilters,
): Promise<EarningsListRow[]> {
  return fetchPayoutRows(filters);
}

export async function sumUnpaidPayouts(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select('sourcer_payout_cents, sites!inner(sourcer_id), invoices!inner(status)')
    .is('sourcer_paid_at', null)
    .not('sourcer_payout_cents', 'is', null)
    .not('sites.sourcer_id', 'is', null)
    .eq('invoices.status', 'Paid');
  const rows = (data ?? []) as unknown as { sourcer_payout_cents: number | null }[];
  return rows.reduce((sum, r) => sum + (r.sourcer_payout_cents ?? 0), 0);
}
