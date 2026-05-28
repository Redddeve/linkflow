import { requireUser } from '@/lib/features/auth';
import { fetchNotifications } from '@/lib/data/notifications';
import { parsePagination } from '@/lib/features/pagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NotificationItem } from '@/components/notifications/notification-item';
import { MarkAllReadButton } from '@/components/notifications/mark-all-read-button';
import Link from 'next/link';

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0
              ? `${unread} unread, ${total} total`
              : `${total} notifications`}
          </p>
        </div>
        {unread > 0 && <MarkAllReadButton />}
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
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/dashboard/notifications?page=${page - 1}&limit=${pageSize}`}
              className="text-primary hover:underline"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/dashboard/notifications?page=${page + 1}&limit=${pageSize}`}
              className="text-primary hover:underline"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
