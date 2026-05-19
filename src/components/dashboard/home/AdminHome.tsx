import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { StatCard } from './stat-card';
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
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user.first_name || user.email}
        </p>
      </div>

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
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Payable commissions
            </div>
            <div className="text-2xl font-semibold tabular-nums mt-1 text-emerald-600">
              {formatCurrency(payableTotalCents)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Total ready to pay out
            </div>
          </div>
          <Link
            href="/dashboard/commissions?status=PAYABLE"
            className="text-sm text-primary hover:underline"
          >
            Review
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
