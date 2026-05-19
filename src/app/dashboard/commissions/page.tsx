import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CommissionFilters } from './components/commission-filters';
import { CommissionsTable } from './components/commissions-table';
import { RunPromotionButton } from './components/run-promotion-button';
import { PageHeader } from '@/components/ui/page-header';
import type { Database } from '@/types/database.types';

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export const metadata = { title: 'Commissions' };

type CommissionStatus = Database['public']['Enums']['commission_status'];
const STATUSES: readonly CommissionStatus[] = ['ACCRUED', 'PAYABLE', 'PAID', 'REVERSED'];

function isStatus(v: string | undefined): v is CommissionStatus {
  return typeof v === 'string' && (STATUSES as readonly string[]).includes(v);
}

export default async function CommissionsPage({ searchParams }: PageProps) {
  const actor = await requireUser();
  if (!actor.role || !['Sourcer', 'Manager', 'Admin'].includes(actor.role)) {
    notFound();
  }

  const params = await searchParams;
  const statusFilter = isStatus(params.status) ? params.status : undefined;

  const supabase = await createClient();
  const isAdmin = actor.role === 'Admin';
  const isSourcer = actor.role === 'Sourcer';

  let query = supabase
    .from('commissions')
    .select('id, order_id, site_id, sourcer_id, amount_cents, status, accrued_at, paid_at, payout_reference, retry_count')
    .order('accrued_at', { ascending: false });

  if (isSourcer) {
    query = query.eq('sourcer_id', actor.id);
  }
  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data: rowsRaw } = await query;
  const rows = rowsRaw ?? [];

  // Resolve site domain and sourcer name in separate lookups.
  const siteIds = [...new Set(rows.map((r) => r.site_id))];
  const sourcerIds = [...new Set(rows.map((r) => r.sourcer_id))];

  const [{ data: sitesData }, { data: sourcersData }] = await Promise.all([
    siteIds.length
      ? supabase.from('sites').select('id, domain').in('id', siteIds)
      : Promise.resolve({ data: [] as { id: string; domain: string }[] }),
    sourcerIds.length && !isSourcer
      ? supabase.from('users').select('id, first_name, last_name').in('id', sourcerIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[] }),
  ]);

  const siteMap = Object.fromEntries((sitesData ?? []).map((s) => [s.id, s.domain]));
  const sourcerMap = Object.fromEntries(
    (sourcersData ?? []).map((u) => [u.id, `${u.first_name} ${u.last_name}`.trim()]),
  );

  const commissions = rows.map((r) => ({
    id: r.id,
    order_id: r.order_id,
    site_domain: siteMap[r.site_id] ?? '—',
    sourcer_id: r.sourcer_id,
    sourcer_name: sourcerMap[r.sourcer_id] ?? null,
    amount_cents: r.amount_cents,
    status: r.status,
    accrued_at: r.accrued_at,
    paid_at: r.paid_at,
    payout_reference: r.payout_reference,
    retry_count: r.retry_count,
  }));

  // Totals: across whole dataset (not paginated), respecting role scope.
  let totalsQuery = supabase.from('commissions').select('status, amount_cents');
  if (isSourcer) totalsQuery = totalsQuery.eq('sourcer_id', actor.id);
  const { data: totalsData } = await totalsQuery;
  const totals = (totalsData ?? []).reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + row.amount_cents;
      return acc;
    },
    {} as Record<CommissionStatus, number>,
  );

  return (
    <div>
      <PageHeader
        title="Commissions"
        description={isSourcer ? 'Your commissions' : 'All commissions'}
        actions={isAdmin ? <RunPromotionButton /> : undefined}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(['ACCRUED', 'PAYABLE', 'PAID', 'REVERSED'] as CommissionStatus[]).map((s) => (
          <div
            key={s}
            className="rounded-xl border border-border bg-card p-4 shadow-xs"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {s}
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              ${((totals[s] ?? 0) / 100).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <CommissionFilters />
        <CommissionsTable
          commissions={commissions}
          showSourcer={!isSourcer}
          canMarkPaid={isAdmin}
        />
      </div>
    </div>
  );
}
