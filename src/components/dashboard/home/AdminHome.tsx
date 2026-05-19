import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { StatCard } from './stat-card';
import { DashboardHeader } from './dashboard-header';
import type { UserRow } from '@/lib/auth';

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function AdminHome({ user }: { user: UserRow }) {
  const supabase = await createClient();

  const [siteReviewRes, pendingInvitesRes, draftInvRes, sentInvRes, payableRes] = await Promise.all(
    [
      supabase
        .from('sites')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending'),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING'),
      supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Draft'),
      supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Sent'),
      supabase.from('commissions').select('amount_cents').eq('status', 'PAYABLE'),
    ],
  );

  const payableTotalCents = (payableRes.data ?? []).reduce(
    (sum, c) => sum + (c.amount_cents ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <DashboardHeader user={user} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Site review queue"
          value={siteReviewRes.count ?? 0}
          href="/dashboard/sites?status=Pending"
          tone="warn"
        />
        <StatCard
          label="Pending invitations"
          value={pendingInvitesRes.count ?? 0}
          href="/dashboard/users?status=PENDING"
        />
        <StatCard
          label="Draft invoices"
          value={draftInvRes.count ?? 0}
          href="/dashboard/invoices?status=Draft"
        />
        <StatCard
          label="Sent invoices"
          value={sentInvRes.count ?? 0}
          href="/dashboard/invoices?status=Sent"
        />
      </div>

      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Payable commissions
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-(--st-live-fg)">
              {formatCurrency(payableTotalCents)}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Total ready to pay out
            </div>
          </div>
          <Link
            href="/dashboard/commissions?status=PAYABLE"
            className="text-sm font-medium text-primary hover:underline"
          >
            Review →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
