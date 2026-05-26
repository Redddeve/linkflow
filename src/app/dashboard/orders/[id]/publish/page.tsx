import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/features/auth';
import { fetchOrderForPublish } from '@/lib/data/orders';
import { BackLink } from '@/components/ui/back-link';
import { PublishOrderForm } from '@/components/orders/publish-order-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublishOrderPage({ params }: PageProps) {
  const { id } = await params;
  await requireRole(['Manager', 'Admin']).catch(() => notFound());

  const { data: order, error } = await fetchOrderForPublish(id);

  if (error || !order) notFound();
  if (order.status !== 'Content Approved') notFound();

  return (
    <div className="space-y-6 max-w-lg">
      <BackLink href={`/dashboard/orders/${id}`} label="Back to order" />
      <div>
        <h1 className="text-2xl font-semibold">Publish order</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {order.site_domain}
        </p>
      </div>

      <PublishOrderForm orderId={id} defaultPublishDate={order.publish_date} />
    </div>
  );
}
