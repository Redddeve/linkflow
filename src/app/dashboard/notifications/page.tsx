import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/features/auth';
import { fetchNotifications } from '@/lib/data/notifications';
import { parsePagination } from '@/lib/features/pagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { NotificationItem } from '@/components/notifications/notification-item';
import { MarkAllReadButton } from '@/components/notifications/mark-all-read-button';
import { ClearReadButton } from '@/components/notifications/clear-read-button';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const { page, pageSize } = parsePagination(params);

  const { rows, total, unread } = await fetchNotifications(user.id, {
    page,
    pageSize,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages) {
    redirect(`/dashboard/notifications?page=${totalPages}&limit=${pageSize}`);
  }

  const readCount = total - unread;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0
              ? `${unread} unread, ${total} total · auto-deleted after 30 days`
              : `${total} notifications · auto-deleted after 30 days`}
          </p>
        </div>
        {(unread > 0 || readCount > 0) && (
          <div className="flex flex-wrap gap-2">
            {unread > 0 && <MarkAllReadButton />}
            {readCount > 0 && <ClearReadButton />}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          {rows.length === 0 ? (
            <div className="px-3 py-12 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {rows.map((n) => (
                <NotificationItem
                  key={n.id}
                  id={n.id}
                  type={n.type}
                  payload={n.payload}
                  readAt={n.read_at}
                  createdAt={n.created_at}
                  showDelete
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Pagination total={total} page={page} pageSize={pageSize} />
    </div>
  );
}
