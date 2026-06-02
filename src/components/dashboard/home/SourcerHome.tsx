import { StatCard } from './stat-card';
import { DashboardHeader, SectionHeading } from './dashboard-header';
import type { UserRow } from '@/lib/features/auth';
import { countSitesByStatusForSourcer } from '@/lib/data/sites';
import { addMonths, firstOfMonth } from '@/lib/features/billing';
import { fetchEarningsTotals } from '@/lib/data/earnings';

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function SourcerHome({ user }: { user: UserRow }) {
  const lastMonth = addMonths(firstOfMonth(new Date()), -1);
  const [pending, active, archived, earnings] = await Promise.all([
    countSitesByStatusForSourcer(user.id, 'Pending'),
    countSitesByStatusForSourcer(user.id, 'Active'),
    countSitesByStatusForSourcer(user.id, 'Archived'),
    fetchEarningsTotals({ month: lastMonth, sourcerId: user.id }),
  ]);

  return (
    <div className="space-y-6">
      <DashboardHeader user={user} />

      <div>
        <SectionHeading title="My sites" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            label="Pending"
            value={pending}
            href="/dashboard/sites?status=Pending"
            tone="warn"
          />
          <StatCard
            label="Active"
            value={active}
            href="/dashboard/sites?status=Active"
            tone="success"
          />
          <StatCard
            label="Archived"
            value={archived}
            href="/dashboard/sites?status=Archived"
            className="col-span-2 sm:col-span-1"
          />
        </div>
      </div>

      <div>
        <SectionHeading title="Earnings (last month)" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            label="Earned"
            value={formatCurrency(earnings.earningsCents)}
            href="/dashboard/earnings"
          />
          <StatCard
            label="Paid"
            value={formatCurrency(earnings.paidCents)}
            href="/dashboard/earnings"
            tone="success"
          />
          <StatCard
            label="Unpaid"
            value={formatCurrency(earnings.unpaidCents)}
            href="/dashboard/earnings"
            tone={earnings.unpaidCents > 0 ? 'warn' : 'default'}
            className="col-span-2 sm:col-span-1"
          />
        </div>
      </div>
    </div>
  );
}
