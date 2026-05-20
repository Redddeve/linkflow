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
import { fetchEarningsTotals } from '@/lib/data/earnings';
import { fetchActiveByRole } from '@/lib/data/users';
import { EarningsFilters } from './components/earnings-filters';

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export const metadata = { title: 'Earnings' };

export default async function EarningsPage({ searchParams }: PageProps) {
  const actor = await requireUser();
  if (!actor.role || !['Sourcer', 'Manager', 'Admin'].includes(actor.role)) {
    notFound();
  }

  const params = await searchParams;
  const month: BillingMonth =
    params.month && isValidBillingMonth(params.month)
      ? params.month
      : addMonths(firstOfMonth(new Date()), -1);

  const isSourcer = actor.role === 'Sourcer';
  const sourcerId = isSourcer ? actor.id : params.sourcer || undefined;

  const [totals, sourcers] = await Promise.all([
    fetchEarningsTotals({ month, sourcerId }),
    isSourcer
      ? Promise.resolve([])
      : fetchActiveByRole('Sourcer'),
  ]);

  const sourcerOptions = sourcers.map((u) => ({
    value: u.id,
    label: `${u.first_name} ${u.last_name}`.trim() || u.id,
  }));

  return (
    <div>
      <PageHeader
        title="Earnings"
        description={`${isSourcer ? 'Your earnings' : 'All earnings'} — ${formatBillingMonth(month)}`}
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Earnings
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            ${(totals.earningsCents / 100).toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Orders count
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {totals.ordersCount}
          </div>
        </div>
      </div>

      <EarningsFilters
        currentMonth={month}
        showSourcer={!isSourcer}
        sourcerOptions={sourcerOptions}
        currentSourcer={sourcerId}
      />
    </div>
  );
}
