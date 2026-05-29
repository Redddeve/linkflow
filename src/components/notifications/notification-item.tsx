'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  formatNotification,
  type FormattedNotification,
} from '@/lib/features/notifications-format';
import {
  deleteNotification,
  markNotificationRead,
} from '@/app/dashboard/notifications/actions';

interface Props {
  id: string;
  type: string;
  payload: unknown;
  readAt: string | null;
  createdAt: string;
  onClick?: () => void;
  /** Show a delete (X) button on hover. Used on the full notifications page. */
  showDelete?: boolean;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString('en-CA');
}

export function NotificationItem({
  id,
  type,
  payload,
  readAt,
  createdAt,
  onClick,
  showDelete = false,
}: Props) {
  const formatted: FormattedNotification = formatNotification(type, payload);
  const isUnread = !readAt;
  const [, startTransition] = useTransition();

  function handleActivate() {
    if (isUnread) {
      // Fire-and-forget: the action revalidates the notifications cache
      // tag so the bell + page refresh in the background while the user
      // navigates to the linked resource.
      startTransition(async () => {
        try {
          await markNotificationRead(id);
        } catch (e) {
          console.error('[notifications] mark-read failed', e);
        }
      });
    }
    onClick?.();
  }

  function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      try {
        await deleteNotification(id);
      } catch (err) {
        console.error('[notifications] delete failed', err);
      }
    });
  }

  const inner = (
    <div className="group/notification flex items-start gap-2 px-2.5 py-2">
      <div className="mt-1.5 shrink-0">
        {isUnread ? (
          <span
            className="block h-2 w-2 rounded-full bg-primary"
            aria-label="Unread"
          />
        ) : (
          <span className="block h-2 w-2 rounded-full bg-transparent" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm">{formatted.title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {timeAgo(createdAt)}
        </div>
      </div>
      {isUnread && !showDelete && (
        <Badge variant="default" className="shrink-0">
          New
        </Badge>
      )}
      {showDelete && (
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Delete notification"
          className="ml-1 inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover/notification:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  if (formatted.href) {
    return (
      <Link
        href={formatted.href}
        onClick={handleActivate}
        className="block cursor-pointer rounded-md hover:bg-muted"
      >
        {inner}
      </Link>
    );
  }
  // No destination — clicking the row should still mark it read so the
  // user can clear the unread badge.
  return (
    <button
      type="button"
      onClick={handleActivate}
      disabled={!isUnread}
      className="block w-full cursor-pointer rounded-md text-left hover:bg-muted disabled:cursor-default"
    >
      {inner}
    </button>
  );
}
