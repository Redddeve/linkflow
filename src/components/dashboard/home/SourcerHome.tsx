import { sumByStatus } from '@/lib/dashboard/counts';
import { StatCard } from './stat-card';
import { DashboardHeader, SectionHeading } from './dashboard-header';
import type { UserRow } from '@/lib/auth';
import { countSitesByStatusForSourcer } from '@/lib/data/sites';
import { fetchCommissionTotals } from '@/lib/data/commissions';

const COMMISSION_STATUSES = ['ACCRUED', 'PAYABLE', 'PAID', 'REVERSED'] as const;
type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function SourcerHome({ user }: { user: UserRow }) {
  const [pending, active, needsChanges, archived, commissions] = await Promise.all([
    countSitesByStatusForSourcer(user.id, 'Pending'),
    countSitesByStatusForSourcer(user.id, 'Active'),
    countSitesByStatusForSourcer(user.id, 'Needs changes'),
    countSitesByStatusForSourcer(user.id, 'Archived'),
    fetchCommissionTotals(user.id),
  ]);

  const totals = sumByStatus(
    commissions as { status: CommissionStatus; amount_cents: number }[],
    COMMISSION_STATUSES,
  );

  return (
    <div className="space-y-6">
      <DashboardHeader user={user} />

      <div>
        <SectionHeading title="My sites" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            label="Needs changes"
            value={needsChanges}
            href="/dashboard/sites?status=Needs+changes"
            tone="warn"
          />
          <StatCard
            label="Archived"
            value={archived}
            href="/dashboard/sites?status=Archived"
          />
        </div>
      </div>

      <div>
        <SectionHeading title="Commissions" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {COMMISSION_STATUSES.map((s) => (
            <StatCard
              key={s}
              label={s}
              value={formatCurrency(totals[s])}
              href={`/dashboard/commissions?status=${s}`}
              tone={s === 'PAYABLE' ? 'success' : s === 'REVERSED' ? 'warn' : 'default'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
