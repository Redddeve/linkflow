import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  formatNotification,
  type FormattedNotification,
} from '@/lib/features/notifications-format';

interface Props {
  id: string;
  type: string;
  payload: unknown;
  readAt: string | null;
  createdAt: string;
  onClick?: () => void;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString('en-CA');
}

export function NotificationItem({
  type,
  payload,
  readAt,
  createdAt,
  onClick,
}: Props) {
  const formatted: FormattedNotification = formatNotification(type, payload);
  const isUnread = !readAt;

  const inner = (
    <div className="flex items-start gap-2 px-2.5 py-2">
      <div className="mt-1.5 shrink-0">
        {isUnread ? (
          <span className="block h-2 w-2 rounded-full bg-primary" aria-label="Unread" />
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
      {isUnread && (
        <Badge variant="default" className="shrink-0">
          New
        </Badge>
      )}
    </div>
  );

  if (formatted.href) {
    return (
      <Link
        href={formatted.href}
        onClick={onClick}
        className="block cursor-pointer rounded-md hover:bg-muted"
      >
        {inner}
      </Link>
    );
  }
  return <div className="rounded-md">{inner}</div>;
}
