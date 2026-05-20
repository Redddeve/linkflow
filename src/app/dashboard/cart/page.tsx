import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { CartRow } from '@/components/cart/cart-row';
import { CheckoutButton } from '@/components/cart/checkout-button';
import { PageHeader } from '@/components/ui/page-header';
import { fetchClientCart, fetchCartItems } from '@/lib/data/cart';

export const metadata = { title: 'Cart' };

export default async function CartPage() {
  const actor = await requireRole(['Client']).catch(() => notFound());

  const cart = await fetchClientCart(actor.id);
  const items = cart ? await fetchCartItems(cart.id) : [];

  const today = new Date().toISOString().split('T')[0];
  const hasUnavailable = items.some((i) => i.sites.status !== 'Active');
  const hasMissingDates = items.some((i) => !i.publish_date);
  const hasPastDates = items.some((i) => i.publish_date && i.publish_date < today);
  const isCheckoutDisabled = items.length === 0 || hasUnavailable || hasMissingDates || hasPastDates;

  let disabledReason: string | undefined;
  if (items.length === 0) disabledReason = 'Cart is empty';
  else if (hasUnavailable) disabledReason = 'Remove unavailable sites first';
  else if (hasMissingDates) disabledReason = 'Set a publish date for all items';
  else if (hasPastDates) disabledReason = 'Publish dates must be today or later';

  const total = items.reduce((sum, i) => sum + (i.sites.price_cents ?? 0), 0);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Cart"
        description={`${items.length} item${items.length !== 1 ? 's' : ''}`}
        actions={
          <Link href="/dashboard/catalog" className={buttonVariants({ variant: 'outline' })}>
            Browse catalog
          </Link>
        }
      />
      <div className="space-y-4">

      {items.length === 0 ? (
        <p className="text-muted-foreground">Your cart is empty.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            {items.map((item, i) => (
              <div key={item.id}>
                {i > 0 && <Separator />}
                <div className="px-6">
                  <CartRow
                    item={{
                      id: item.id,
                      site_id: item.site_id,
                      publish_date: item.publish_date,
                      site_domain: item.sites.domain,
                      site_status: item.sites.status,
                      site_price_cents: item.sites.price_cents,
                      site_link_type: item.sites.link_type,
                    }}
                  />
                </div>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">
                  {total > 0 ? `$${(total / 100).toFixed(2)}` : '—'}
                </p>
              </div>
              <CheckoutButton
                disabled={isCheckoutDisabled}
                disabledReason={disabledReason}
                itemCount={items.length}
              />
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
