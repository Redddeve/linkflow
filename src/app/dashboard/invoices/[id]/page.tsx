import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import {
  fetchInvoiceById,
  fetchInvoiceOrders,
  fetchUnattachedOrdersForInvoice,
} from '@/lib/data/invoices';
import { fetchUsersWithEmailByIds } from '@/lib/data/users';
import { BackLink } from '@/components/ui/back-link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { buttonVariants } from '@/components/ui/button';
import { formatBillingMonth } from '@/lib/billing';
import { InvoiceStatusBadge } from '@/components/invoices/components/invoice-status-badge';
import { SendInvoiceDialog } from '@/components/invoices/components/send-invoice-dialog';
import { MarkPaidDialog } from '@/components/invoices/components/mark-paid-dialog';
import { EditOrdersDialog } from '@/components/invoices/components/edit-orders-dialog';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const actor = await requireUser();
  if (!actor.role) notFound();

  const { data: invoice, error } = await fetchInvoiceById(id);

  if (error || !invoice) notFound();

  // Access control: Client sees own only
  if (actor.role === 'Client' && invoice.client_id !== actor.id) notFound();
  if (!['Client', 'Manager', 'Admin'].includes(actor.role)) notFound();

  const isManagerOrAdmin = actor.role === 'Manager' || actor.role === 'Admin';
  const isAdmin = actor.role === 'Admin';

  // Load attached orders + (for Draft) candidates to add
  const orders = await fetchInvoiceOrders(invoice.id);
  const availableOrders =
    invoice.status === 'Draft'
      ? await fetchUnattachedOrdersForInvoice(
          invoice.client_id,
          invoice.billing_month,
        )
      : [];

  // Load user records (client + sent_by + marked_as_paid_by)
  const userIds = [
    invoice.client_id,
    invoice.sent_by_id,
    invoice.marked_as_paid_by_id,
  ].filter(Boolean) as string[];

  const users = await fetchUsersWithEmailByIds(userIds);
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const client = userMap[invoice.client_id];
  const sentBy = invoice.sent_by_id ? userMap[invoice.sent_by_id] : null;
  const paidBy = invoice.marked_as_paid_by_id
    ? userMap[invoice.marked_as_paid_by_id]
    : null;

  const canSend = isManagerOrAdmin && invoice.status === 'Draft';
  const canMarkPaid = isAdmin && invoice.status === 'Sent';
  const canEditOrders = isManagerOrAdmin && invoice.status === 'Draft';

  return (
    <div className="space-y-6">
      <BackLink href="/dashboard/invoices" label="Invoices" />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {formatBillingMonth(invoice.billing_month)} invoice
          </h1>
          <p className="text-sm text-muted-foreground">
            {client
              ? `${client.first_name} ${client.last_name}`
              : 'Unknown client'}
          </p>
        </div>
        <div className="flex gap-2">
          {canEditOrders && (
            <EditOrdersDialog
              invoiceId={invoice.id}
              orders={orders.map((o) => ({
                id: o.id,
                site_domain: o.site_domain,
                publish_date: o.publish_date,
                price_cents: o.price_cents,
              }))}
              availableOrders={availableOrders}
            />
          )}
          <Link
            href={`/dashboard/invoices/${invoice.id}/pdf`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Download PDF
          </Link>
          {canSend && <SendInvoiceDialog invoiceId={invoice.id} />}
          {canMarkPaid && <MarkPaidDialog invoiceId={invoice.id} />}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Summary</span>
            <InvoiceStatusBadge status={invoice.status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <p className="text-muted-foreground">Billing month</p>
            <p className="font-medium">
              {formatBillingMonth(invoice.billing_month)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="font-medium tabular-nums">
              ${(invoice.total_price_cents / 100).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium">
              {new Date(invoice.created_at).toLocaleDateString('en-CA')}
            </p>
          </div>
          {(invoice.status === 'Sent' || invoice.status === 'Paid') && (
            <>
              <div>
                <p className="text-muted-foreground">Sent at</p>
                <p className="font-medium">
                  {invoice.sent_at
                    ? new Date(invoice.sent_at).toLocaleString('en-CA')
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Sent by</p>
                <p className="font-medium">
                  {sentBy ? `${sentBy.first_name} ${sentBy.last_name}` : '—'}
                </p>
              </div>
            </>
          )}
          {invoice.status === 'Paid' && (
            <>
              <div>
                <p className="text-muted-foreground">Marked paid at</p>
                <p className="font-medium">
                  {invoice.marked_as_paid_at
                    ? new Date(invoice.marked_as_paid_at).toLocaleString(
                        'en-CA',
                      )
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Marked paid by</p>
                <p className="font-medium">
                  {paidBy ? `${paidBy.first_name} ${paidBy.last_name}` : '—'}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders attached.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 font-medium">Site</th>
                  <th className="py-2 font-medium">Published</th>
                  <th className="py-2 font-medium">Billing month</th>
                  <th className="py-2 font-medium text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b last:border-b-0">
                    <td className="py-2">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        className="hover:underline"
                      >
                        {o.site_domain}
                      </Link>
                    </td>
                    <td className="py-2 text-muted-foreground tabular-nums">
                      {o.publish_date ?? '—'}
                    </td>
                    <td className="py-2 text-muted-foreground tabular-nums">
                      {o.billing_month
                        ? formatBillingMonth(o.billing_month)
                        : '—'}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      ${(o.price_cents / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
