import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/features/auth';
import { createClient } from '@/lib/supabase/server';
import { fetchOrderById, fetchOrderComments } from '@/lib/data/orders';
import { fetchChatParticipants } from '@/lib/data/chat';
import { fetchUsersByIds } from '@/lib/data/users';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { CancelOrderDialog } from '@/components/orders/cancel-order-dialog';
import { EditPublishDateDialog } from '@/components/orders/edit-publish-date-dialog';
import { AssignCopywriterDialog } from '@/components/orders/assign-copywriter-dialog';
import { ApproveOrderDialog } from '@/components/orders/approve-order-dialog';
import { RejectOrderDialog } from '@/components/orders/reject-order-dialog';
import { CommentsTimeline } from '@/components/orders/comments-timeline';
import { AddCommentForm } from '@/components/orders/add-comment-form';
import { AuditTimeline } from '@/components/orders/audit-timeline';
import { listCopywriters } from '../actions';
import { BackLink } from '@/components/ui/back-link';
import { StartChatButton } from '@/components/orders/start-chat-button';
import { PayoutPaidDialog } from '@/components/orders/payout-paid-dialog';

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatDate(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString('en-CA') : '—';
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const actor = await requireUser();
  if (!actor.role) notFound();

  const { data: order, error } = await fetchOrderById(id);

  if (error || !order) notFound();

  if (actor.role === 'Client' && order.created_by_id !== actor.id) notFound();
  if (actor.role === 'Copywriter' && order.copywriter_id !== actor.id)
    notFound();
  if (actor.role === 'Sourcer') {
    const supabase = await createClient();
    const { data: site } = await supabase
      .from('sites')
      .select('sourcer_id')
      .eq('id', order.site_id)
      .single();
    if (site?.sourcer_id !== actor.id) notFound();
  }

  const isManagerOrAdmin = actor.role === 'Manager' || actor.role === 'Admin';
  const isAdmin = actor.role === 'Admin';
  const isClient = actor.role === 'Client';
  const isCopywriter = actor.role === 'Copywriter';
  const isSourcer = actor.role === 'Sourcer';
  const canTogglePayout =
    isAdmin && order.sourcer_payout_cents != null && !!order.published_at;

  const comments = await fetchOrderComments(id);

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
  const copywriter = order.copywriter_id
    ? (userMap[order.copywriter_id] ?? null)
    : null;
  const manager = order.manager_id ? (userMap[order.manager_id] ?? null) : null;
  const client = userMap[order.created_by_id] ?? null;

  const copywriters = isManagerOrAdmin ? await listCopywriters() : [];

  const canCancel = isClient && order.status === 'New';
  const canEditDate = isClient && order.status === 'New';
  const canAssign = isManagerOrAdmin && order.status === 'New';
  const canReassign =
    isManagerOrAdmin &&
    (order.status === 'In Progress' || order.status === 'Needs changes');
  const canEditContent =
    isCopywriter &&
    order.copywriter_id === actor.id &&
    (order.status === 'In Progress' || order.status === 'Needs changes');
  const canApprove =
    order.status === 'Content Sent' &&
    (isManagerOrAdmin || (isClient && order.created_by_id === actor.id));
  const canReject = canApprove;
  const canPublish = isManagerOrAdmin && order.status === 'Content Approved';
  const canComment =
    isManagerOrAdmin ||
    (isClient && order.created_by_id === actor.id) ||
    (isCopywriter && order.copywriter_id === actor.id);
  const hasChatCounterpart = Boolean(order.copywriter_id || order.manager_id);
  const isChatParticipant = order.chat_id
    ? (await fetchChatParticipants(order.chat_id)).some(
        (p) => p.id === actor.id,
      )
    : false;
  const canStartChat = order.chat_id
    ? isChatParticipant
    : (isManagerOrAdmin ||
        (isClient && order.created_by_id === actor.id) ||
        (isCopywriter && order.copywriter_id === actor.id)) &&
      hasChatCounterpart;

  const metrics: { label: string; value: React.ReactNode }[] = [];
  if (!isSourcer) {
    metrics.push({
      label: 'Price',
      value: `$${(order.price_cents / 100).toFixed(2)}`,
    });
  }
  if (isSourcer && order.sourcer_payout_cents != null) {
    metrics.push({
      label: 'Payout',
      value: (
        <span>
          ${(order.sourcer_payout_cents / 100).toFixed(2)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            (
            {order.sourcer_paid_at
              ? `paid ${formatDate(order.sourcer_paid_at)}`
              : 'unpaid'}
            )
          </span>
        </span>
      ),
    });
  }
  metrics.push({ label: 'Publish date', value: order.publish_date });
  metrics.push({ label: 'DR', value: order.site_dr ?? '—' });
  metrics.push({
    label: 'Traffic',
    value: order.site_organic_traffic_count.toLocaleString(),
  });

  const renderPerson = (
    user: { first_name: string; last_name: string; status: string } | null,
  ): React.ReactNode =>
    user && user.status !== 'DISABLED' ? (
      `${user.first_name} ${user.last_name}`
    ) : (
      <span className="text-muted-foreground">Unassigned</span>
    );

  const peopleRows: { label: string; value: React.ReactNode }[] = [
    { label: 'Client', value: renderPerson(client) },
    { label: 'Copywriter', value: renderPerson(copywriter) },
    { label: 'Manager', value: renderPerson(manager) },
  ];

  const timelineRows: { label: string; value: React.ReactNode }[] = [
    {
      label: 'Link type',
      value: <span className="capitalize">{order.site_link_type}</span>,
    },
    { label: 'Created', value: formatDate(order.created_at) },
  ];
  if (order.sent_at)
    timelineRows.push({
      label: 'Content sent',
      value: formatDate(order.sent_at),
    });
  if (order.approved_at)
    timelineRows.push({
      label: 'Approved',
      value: formatDate(order.approved_at),
    });
  if (order.published_at)
    timelineRows.push({
      label: 'Published',
      value: formatDate(order.published_at),
    });
  if (order.canceled_at)
    timelineRows.push({
      label: 'Canceled',
      value: formatDate(order.canceled_at),
    });

  return (
    <div className="space-y-6">
      <BackLink href="/dashboard/orders" label="Orders" />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight leading-tight">
              {order.site_domain}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Order #{order.id.slice(0, 8)}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
          {canEditContent && (
            <Link
              href={`/dashboard/orders/${id}/edit`}
              className={buttonVariants()}
            >
              Edit content
            </Link>
          )}
          {canEditDate && (
            <EditPublishDateDialog
              orderId={id}
              currentDate={order.publish_date}
            />
          )}
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
            <Link
              href={`/dashboard/orders/${id}/publish`}
              className={buttonVariants()}
            >
              Publish
            </Link>
          )}
          {canStartChat && (
            <StartChatButton
              orderId={id}
              existingChatId={order.chat_id ?? null}
            />
          )}
          {canTogglePayout && (
            <PayoutPaidDialog
              orderId={id}
              currentlyPaid={!!order.sourcer_paid_at}
              currentReference={order.sourcer_payout_reference ?? null}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <Card key={m.label} size="sm">
            <CardContent>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {m.label}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {m.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {order.content_body &&
            (isManagerOrAdmin ||
              isCopywriter ||
              (isClient &&
                (order.status === 'Content Sent' ||
                  order.status === 'Content Approved' ||
                  order.status === 'Published' ||
                  order.status === 'Needs changes'))) && (
              <Card>
                <CardHeader>
                  <CardTitle>Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                    {order.content_body}
                  </p>
                </CardContent>
              </Card>
            )}

          {order.published_url && (
            <Card>
              <CardHeader>
                <CardTitle>Published URL</CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={order.published_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline underline-offset-2 break-all text-primary"
                >
                  {order.published_url}
                </a>
              </CardContent>
            </Card>
          )}

          {order.cancellation_reason && (
            <Card>
              <CardHeader>
                <CardTitle>Cancellation reason</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {order.cancellation_reason}
                </p>
              </CardContent>
            </Card>
          )}

          {order.site_description && (
            <Card>
              <CardHeader>
                <CardTitle>Site description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {order.site_description}
                </p>
              </CardContent>
            </Card>
          )}

          {order.site_requirements && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {order.site_requirements}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CommentsTimeline comments={comments} userMap={userMap} />
              {canComment && <AddCommentForm orderId={id} />}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-1">
          {peopleRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>People</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {peopleRows.map((r) => (
                    <div
                      key={r.label}
                      className="flex items-start justify-between gap-3"
                    >
                      <dt className="text-muted-foreground">{r.label}</dt>
                      <dd className="font-medium text-right text-base">
                        {r.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                {timelineRows.map((r) => (
                  <div
                    key={r.label}
                    className="flex items-start justify-between gap-3"
                  >
                    <dt className="text-muted-foreground">{r.label}</dt>
                    <dd className="font-medium text-right text-base">
                      {r.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditTimeline orderId={id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
