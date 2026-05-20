import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { fetchOrderForEdit } from '@/lib/data/orders';
import { buttonVariants } from '@/components/ui/button';
import { OrderStatusBadge } from '../../components/order-status-badge';
import { ContentEditorForm } from '../../components/content-editor-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContentEditorPage({ params }: PageProps) {
  const { id } = await params;
  const actor = await requireRole(['Copywriter']).catch(() => notFound());

  const { data: order, error } = await fetchOrderForEdit(id);

  if (error || !order) notFound();

  // Only the assigned copywriter can access this page
  if (order.copywriter_id !== actor.id) notFound();

  // Only editable statuses
  if (order.status !== 'In Progress' && order.status !== 'Needs changes') notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{order.site_domain}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">Publish date: {order.publish_date}</p>
        </div>
        <Link href={`/dashboard/orders/${id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Back to order
        </Link>
      </div>

      {order.site_requirements && (
        <div className="rounded-md border bg-muted/40 p-4 space-y-1">
          <h2 className="text-sm font-semibold">Requirements</h2>
          <p className="text-sm whitespace-pre-wrap">{order.site_requirements}</p>
        </div>
      )}

      {order.site_description && (
        <div className="rounded-md border bg-muted/40 p-4 space-y-1">
          <h2 className="text-sm font-semibold">Site description</h2>
          <p className="text-sm whitespace-pre-wrap">{order.site_description}</p>
        </div>
      )}

      <ContentEditorForm
        orderId={id}
        initialBody={order.content_body}
        status={order.status}
      />
    </div>
  );
}
