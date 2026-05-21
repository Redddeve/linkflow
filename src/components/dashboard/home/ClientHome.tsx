import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { countByStatus } from '@/lib/dashboard/counts';
import { StatCard } from './stat-card';
import { DashboardHeader } from './dashboard-header';
import type { UserRow } from '@/lib/auth';
import { fetchClientActiveOrders } from '@/lib/data/orders';
import {
  fetchClientCart,
  fetchCartItemsWithPrice,
} from '@/lib/data/cart';
import {
  fetchLatestInvoiceForClient,
  sumClientInvoicesByStatus,
} from '@/lib/data/invoices';

const CLIENT_ACTIVE_STATUSES = ['New', 'In Progress', 'Needs changes', 'Content Sent'] as const;
type ClientActiveStatus = (typeof CLIENT_ACTIVE_STATUSES)[number];

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatBillingMonth(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

export async function ClientHome({ user }: { user: UserRow }) {
  const [orders, cart, latestInvoice, outstandingCents] = await Promise.all([
    fetchClientActiveOrders(user.id),
    fetchClientCart(user.id),
    fetchLatestInvoiceForClient(user.id),
    sumClientInvoicesByStatus(user.id, 'Sent'),
  ]);

  let cartCount = 0;
  let cartTotalCents = 0;
  if (cart) {
    const items = await fetchCartItemsWithPrice(cart.id);
    cartCount = items.length;
    cartTotalCents = items.reduce((sum, i) => sum + (i.sites?.price_cents ?? 0), 0);
  }

  const counts = countByStatus(
    orders as { status: ClientActiveStatus }[],
    CLIENT_ACTIVE_STATUSES,
  );

  return (
    <div className="space-y-6">
      <DashboardHeader user={user} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="New" value={counts['New']} href="/dashboard/orders?status=New" />
        <StatCard
          label="In Progress"
          value={counts['In Progress']}
          href="/dashboard/orders?status=In+Progress"
        />
        <StatCard
          label="Needs changes"
          value={counts['Needs changes']}
          href="/dashboard/orders?status=Needs+changes"
          tone="warn"
        />
        <StatCard
          label="Awaiting review"
          value={counts['Content Sent']}
          href="/dashboard/orders?status=Content+Sent"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cart
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {cartCount} item{cartCount !== 1 ? 's' : ''}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {cartCount > 0 ? formatCurrency(cartTotalCents) : 'Cart is empty'}
              </div>
            </div>
            <Separator />
            <div className="flex gap-2">
              <Link
                href="/dashboard/cart"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                View cart
              </Link>
              <Link
                href="/dashboard/catalog"
                className={buttonVariants({ variant: 'default', size: 'sm' })}
              >
                Browse catalog
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Latest invoice
              </div>
              {latestInvoice ? (
                <>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {formatCurrency(latestInvoice.total_price_cents)}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {formatBillingMonth(latestInvoice.billing_month)} · {latestInvoice.status}
                  </div>
                </>
              ) : (
                <div className="mt-1 text-sm text-muted-foreground">No invoices yet</div>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Outstanding
                </div>
                <div className="mt-1 text-lg font-semibold tabular-nums">
                  {formatCurrency(outstandingCents)}
                </div>
              </div>
              <Link
                href="/dashboard/invoices?status=Sent"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                View invoices
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
