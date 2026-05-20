import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { fetchOrderById, fetchOrderComments } from '@/lib/data/orders';
import { fetchUsersByIds } from '@/lib/data/users';
import { buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { OrderStatusBadge } from '../components/order-status-badge';
import { CancelOrderDialog } from '../components/cancel-order-dialog';
import { EditPublishDateDialog } from '../components/edit-publish-date-dialog';
import { AssignCopywriterDialog } from '../components/assign-copywriter-dialog';
import { ApproveOrderDialog } from '../components/approve-order-dialog';
import { RejectOrderDialog } from '../components/reject-order-dialog';
import { CommentsTimeline } from '../components/comments-timeline';
import { AddCommentForm } from '../components/add-comment-form';
import { listCopywriters } from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const actor = await requireUser();
  if (!actor.role) notFound();

  const { data: order, error } = await fetchOrderById(id);

  if (error || !order) notFound();

  // Access control: clients see only own orders, copywriters only assigned
  if (actor.role === 'Client' && order.created_by_id !== actor.id) notFound();
  if (actor.role === 'Copywriter' && order.copywriter_id !== actor.id) notFound();

  const isManagerOrAdmin = actor.role === 'Manager' || actor.role === 'Admin';
  const isClient = actor.role === 'Client';
  const isCopywriter = actor.role === 'Copywriter';

  // Fetch comments
  const comments = await fetchOrderComments(id);

  // Collect all user IDs needed (order actors + comment authors)
  const commentAuthorIds = comments.map((c) => c.created_by_id);
  const userIds = [
    order.copywriter_id,
    order.manager_id,
    order.created_by_id,
    ...commentAuthorIds,
  ].filter(Boolean) as string[];

  const uniqueIds = [...new Set(userIds)];
  const relatedUsers = await fetchUsersByIds(uniqueIds);

  const userMap = Object.fromEntries(relatedUsers.map((u) => [u.id, u]));
  const copywriter = order.copywriter_id ? (userMap[order.copywriter_id] ?? null) : null;
  const manager = order.manager_id ? (userMap[order.manager_id] ?? null) : null;
  const client = userMap[order.created_by_id] ?? null;

  // Load copywriters list for assign/reassign (manager/admin only)
  const copywriters = isManagerOrAdmin ? await listCopywriters() : [];

  const canCancel = isClient && order.status === 'New';
  const canEditDate = isClient && order.status === 'New';
  const canAssign = isManagerOrAdmin && order.status === 'New';
  const canReassign = isManagerOrAdmin && (order.status === 'In Progress' || order.status === 'Needs changes');
  const canEditContent = isCopywriter && order.copywriter_id === actor.id && (order.status === 'In Progress' || order.status === 'Needs changes');
  const canApprove = isClient && order.status === 'Content Sent' && order.created_by_id === actor.id;
  const canReject = canApprove;
  const canPublish = isManagerOrAdmin && order.status === 'Content Approved';
  const canComment = isManagerOrAdmin
    || (isClient && order.created_by_id === actor.id)
    || (isCopywriter && order.copywriter_id === actor.id);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{order.site_domain}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Order #{order.id.slice(0, 8)}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
          {canEditContent && (
            <Link href={`/dashboard/orders/${id}/edit`} className={buttonVariants()}>
              Edit content
            </Link>
          )}
          {canEditDate && <EditPublishDateDialog orderId={id} currentDate={order.publish_date} />}
          {canCancel && <CancelOrderDialog orderId={id} />}
          {canApprove && <ApproveOrderDialog orderId={id} />}
          {canReject && <RejectOrderDialog orderId={id} />}
          {canAssign && (
            <AssignCopywriterDialog orderId={id} copywriters={copywriters} />
          )}
          {canReassign && (
            <AssignCopywriterDialog
              orderId={id}
              copywriters={copywriters}
              isReassign
              currentCopywriterId={order.copywriter_id}
            />
          )}
          {canPublish && (
            <Link href={`/dashboard/orders/${id}/publish`} className={buttonVariants()}>
              Publish
            </Link>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="font-medium"><OrderStatusBadge status={order.status} /></dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Publish date</dt>
          <dd className="font-medium">{order.publish_date}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Price</dt>
          <dd className="font-medium">${(order.price_cents / 100).toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Link type</dt>
          <dd className="font-medium capitalize">{order.site_link_type}</dd>
        </div>
        {isManagerOrAdmin && client && (
          <div>
            <dt className="text-muted-foreground">Client</dt>
            <dd className="font-medium">{client.first_name} {client.last_name}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground">Copywriter</dt>
          <dd className="font-medium">
            {copywriter ? `${copywriter.first_name} ${copywriter.last_name}` : <span className="text-muted-foreground">Unassigned</span>}
          </dd>
        </div>
        {isManagerOrAdmin && manager && (
          <div>
            <dt className="text-muted-foreground">Manager</dt>
            <dd className="font-medium">{manager.first_name} {manager.last_name}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground">DR</dt>
          <dd className="font-medium">{order.site_dr ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Traffic</dt>
          <dd className="font-medium">{order.site_organic_traffic_count.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Created</dt>
          <dd className="font-medium">{new Date(order.created_at).toLocaleDateString('en-CA')}</dd>
        </div>
        {order.sent_at && (
          <div>
            <dt className="text-muted-foreground">Content sent</dt>
            <dd className="font-medium">{new Date(order.sent_at).toLocaleDateString('en-CA')}</dd>
          </div>
        )}
        {order.approved_at && (
          <div>
            <dt className="text-muted-foreground">Approved</dt>
            <dd className="font-medium">{new Date(order.approved_at).toLocaleDateString('en-CA')}</dd>
          </div>
        )}
        {order.published_at && (
          <div>
            <dt className="text-muted-foreground">Published</dt>
            <dd className="font-medium">{new Date(order.published_at).toLocaleDateString('en-CA')}</dd>
          </div>
        )}
        {order.canceled_at && (
          <div>
            <dt className="text-muted-foreground">Canceled</dt>
            <dd className="font-medium">{new Date(order.canceled_at).toLocaleDateString('en-CA')}</dd>
          </div>
        )}
        {order.published_url && (
          <div className="col-span-2">
            <dt className="text-muted-foreground">Published URL</dt>
            <dd className="font-medium">
              <a
                href={order.published_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 break-all"
              >
                {order.published_url}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {order.cancellation_reason && (
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground">Cancellation reason</h2>
          <p className="text-sm whitespace-pre-wrap">{order.cancellation_reason}</p>
        </div>
      )}

      {order.site_description && (
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground">Site description</h2>
          <p className="text-sm whitespace-pre-wrap">{order.site_description}</p>
        </div>
      )}

      {order.site_requirements && (
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground">Requirements</h2>
          <p className="text-sm whitespace-pre-wrap">{order.site_requirements}</p>
        </div>
      )}

      {order.content_body && (isManagerOrAdmin || isCopywriter) && (
        <>
          <Separator />
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Content</h2>
            <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed">{order.content_body}</p>
          </div>
        </>
      )}

      <Separator />

      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Comments</h2>
        <CommentsTimeline comments={comments} userMap={userMap} />
        {canComment && <AddCommentForm orderId={id} />}
      </div>
    </div>
  );
}
