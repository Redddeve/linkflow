import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { StatCard } from './stat-card';
import { DashboardHeader } from './dashboard-header';
import type { UserRow } from '@/lib/auth';
import { countSitesByStatus } from '@/lib/data/sites';
import { countUsersByStatus } from '@/lib/data/users';
import { countInvoicesByStatus } from '@/lib/data/invoices';
import { sumPayableCommissions } from '@/lib/data/commissions';

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function AdminHome({ user }: { user: UserRow }) {
  const [siteReview, pendingInvites, draftInv, sentInv, payableTotalCents] =
    await Promise.all([
      countSitesByStatus('Pending'),
      countUsersByStatus('PENDING'),
      countInvoicesByStatus('Draft'),
      countInvoicesByStatus('Sent'),
      sumPayableCommissions(),
    ]);

  return (
    <div className="space-y-6">
      <DashboardHeader user={user} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Site review queue"
          value={siteReview}
          href="/dashboard/sites?status=Pending"
          tone="warn"
        />
        <StatCard
          label="Pending invitations"
          value={pendingInvites}
          href="/dashboard/users?status=PENDING"
        />
        <StatCard
          label="Draft invoices"
          value={draftInv}
          href="/dashboard/invoices?status=Draft"
        />
        <StatCard
          label="Sent invoices"
          value={sentInv}
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
