import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import {
  addMonths,
  firstOfMonth,
  formatBillingMonth,
  isValidBillingMonth,
  type BillingMonth,
} from '@/lib/billing';
import { fetchEarningsList, fetchEarningsTotals } from '@/lib/data/earnings';
import { fetchActiveByRole, fetchUsersByIds } from '@/lib/data/users';
import { Pagination } from '@/components/ui/pagination';
import { parsePagination } from '@/lib/pagination';
import { EarningsFilters } from './components/earnings-filters';
import { EarningsTable, type EarningsTableRow } from './components/earnings-table';

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export const metadata = { title: 'Earnings' };

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function EarningsPage({ searchParams }: PageProps) {
  const actor = await requireUser();
  if (!actor.role || !['Sourcer', 'Admin'].includes(actor.role)) {
    notFound();
  }

  const params = await searchParams;
  const month: BillingMonth =
    params.month && isValidBillingMonth(params.month)
      ? params.month
      : addMonths(firstOfMonth(new Date()), -1);

  const isSourcer = actor.role === 'Sourcer';
  const isAdmin = actor.role === 'Admin';
  const sourcerId = isSourcer ? actor.id : params.sourcer || undefined;
  const { page, pageSize } = parsePagination(params);

  const [totals, rows, sourcers] = await Promise.all([
    fetchEarningsTotals({ month, sourcerId }),
    fetchEarningsList({ month, sourcerId }),
    isSourcer ? Promise.resolve([]) : fetchActiveByRole('Sourcer'),
  ]);

  const sourcerOptions = sourcers.map((u) => ({
    value: u.id,
    label: `${u.first_name} ${u.last_name}`.trim() || u.id,
  }));

  // Resolve sourcer names for admin view when not filtering by a single sourcer.
  let sourcerNameMap: Record<string, string> = {};
  if (!isSourcer) {
    const ids = [...new Set(rows.map((r) => r.sourcer_id))];
    const users = await fetchUsersByIds(ids);
    sourcerNameMap = Object.fromEntries(
      users.map((u) => [u.id, `${u.first_name} ${u.last_name}`.trim() || u.id]),
    );
  }

  const allTableRows: EarningsTableRow[] = rows.map((r) => ({
    id: r.id,
    site_domain: r.site_domain,
    published_at: r.published_at,
    publish_date: r.publish_date,
    payout_cents: r.sourcer_payout_cents,
    commission_cents: r.commission_cents,
    paid_at: r.sourcer_paid_at,
    payout_reference: r.sourcer_payout_reference,
    sourcer_name: isSourcer ? null : sourcerNameMap[r.sourcer_id] ?? null,
  }));
  const total = allTableRows.length;
  const offset = (page - 1) * pageSize;
  const tableRows = allTableRows.slice(offset, offset + pageSize);

  return (
    <div>
      <PageHeader
        title="Earnings"
        description={`${isSourcer ? 'Your earnings' : 'All sourcer earnings'} — ${formatBillingMonth(month)}`}
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total earned
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {formatMoney(totals.earningsCents)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Paid
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {formatMoney(totals.paidCents)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Unpaid
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {formatMoney(totals.unpaidCents)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Commission
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {formatMoney(totals.commissionCents)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Orders
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {totals.ordersCount}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <EarningsFilters
          currentMonth={month}
          showSourcer={!isSourcer}
          sourcerOptions={sourcerOptions}
          currentSourcer={sourcerId}
        />
        <EarningsTable
          rows={tableRows}
          showSourcer={!isSourcer}
          canMarkPaid={isAdmin}
        />
        <Pagination total={total} page={page} pageSize={pageSize} />
      </div>
    </div>
  );
}
