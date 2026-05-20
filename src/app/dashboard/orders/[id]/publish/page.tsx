import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { fetchOrderForPublish } from '@/lib/data/orders';
import { buttonVariants } from '@/components/ui/button';
import { PublishOrderForm } from '../../components/publish-order-form';

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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Publish order</h1>
          <p className="text-sm text-muted-foreground mt-1">{order.site_domain}</p>
        </div>
        <Link href={`/dashboard/orders/${id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Back to order
        </Link>
      </div>

      <PublishOrderForm orderId={id} defaultPublishDate={order.publish_date} />
    </div>
  );
}
