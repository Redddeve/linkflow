import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { countByStatus } from '@/lib/dashboard/counts';
import { StatCard } from './stat-card';
import type { UserRow } from '@/lib/auth';

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
  const supabase = await createClient();

  const [ordersRes, cartRes, latestInvoiceRes, outstandingRes] = await Promise.all([
    supabase
      .from('orders')
      .select('status')
      .eq('created_by_id', user.id)
      .not('status', 'in', '("Completed","Canceled")'),
    supabase.from('carts').select('id').eq('created_by_id', user.id).maybeSingle(),
    supabase
      .from('invoices')
      .select('id, billing_month, total_price_cents, status')
      .eq('client_id', user.id)
      .order('billing_month', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('invoices')
      .select('total_price_cents')
      .eq('client_id', user.id)
      .eq('status', 'Sent'),
  ]);

  let cartCount = 0;
  let cartTotalCents = 0;
  if (cartRes.data) {
    const { data: items } = await supabase
      .from('cart_items')
      .select('id, sites!inner(price_cents)')
      .eq('cart_id', cartRes.data.id);
    const list = (items ?? []) as { id: string; sites: { price_cents: number } }[];
    cartCount = list.length;
    cartTotalCents = list.reduce((sum, i) => sum + (i.sites?.price_cents ?? 0), 0);
  }

  const counts = countByStatus(
    (ordersRes.data ?? []) as { status: ClientActiveStatus }[],
    CLIENT_ACTIVE_STATUSES,
  );
  const outstandingCents = (outstandingRes.data ?? []).reduce(
    (sum, i) => sum + (i.total_price_cents ?? 0),
    0,
  );
  const latestInvoice = latestInvoiceRes.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user.first_name || user.email}
        </p>
      </div>

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
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Cart</div>
                <div className="text-2xl font-semibold tabular-nums mt-1">
                  {cartCount} item{cartCount !== 1 ? 's' : ''}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {cartCount > 0 ? formatCurrency(cartTotalCents) : 'Cart is empty'}
                </div>
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
          <CardContent className="p-4 space-y-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Latest invoice
              </div>
              {latestInvoice ? (
                <>
                  <div className="text-2xl font-semibold tabular-nums mt-1">
                    {formatCurrency(latestInvoice.total_price_cents)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {formatBillingMonth(latestInvoice.billing_month)} · {latestInvoice.status}
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground mt-1">No invoices yet</div>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Outstanding
                </div>
                <div className="text-lg font-semibold tabular-nums mt-1">
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
