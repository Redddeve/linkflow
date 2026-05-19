import { createClient } from '@/lib/supabase/server';
import { sumByStatus } from '@/lib/dashboard/counts';
import { StatCard } from './stat-card';
import type { UserRow } from '@/lib/auth';

const COMMISSION_STATUSES = ['ACCRUED', 'PAYABLE', 'PAID', 'REVERSED'] as const;
type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function SourcerHome({ user }: { user: UserRow }) {
  const supabase = await createClient();

  const [pendingRes, activeRes, needsChangesRes, archivedRes, commissionsRes] = await Promise.all([
    supabase
      .from('sites')
      .select('*', { count: 'exact', head: true })
      .eq('sourcer_id', user.id)
      .eq('status', 'Pending'),
    supabase
      .from('sites')
      .select('*', { count: 'exact', head: true })
      .eq('sourcer_id', user.id)
      .eq('status', 'Active'),
    supabase
      .from('sites')
      .select('*', { count: 'exact', head: true })
      .eq('sourcer_id', user.id)
      .eq('status', 'Needs changes'),
    supabase
      .from('sites')
      .select('*', { count: 'exact', head: true })
      .eq('sourcer_id', user.id)
      .eq('status', 'Archived'),
    supabase
      .from('commissions')
      .select('status, amount_cents')
      .eq('sourcer_id', user.id),
  ]);

  const totals = sumByStatus(
    (commissionsRes.data ?? []) as { status: CommissionStatus; amount_cents: number }[],
    COMMISSION_STATUSES,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user.first_name || user.email}
        </p>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">My sites</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Pending"
            value={pendingRes.count ?? 0}
            href="/dashboard/sites?status=Pending"
            tone="warn"
          />
          <StatCard
            label="Active"
            value={activeRes.count ?? 0}
            href="/dashboard/sites?status=Active"
            tone="success"
          />
          <StatCard
            label="Needs changes"
            value={needsChangesRes.count ?? 0}
            href="/dashboard/sites?status=Needs+changes"
            tone="warn"
          />
          <StatCard
            label="Archived"
            value={archivedRes.count ?? 0}
            href="/dashboard/sites?status=Archived"
          />
        </div>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Commissions</div>
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
