'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NotificationItem } from '@/components/notifications/notification-item';
import { markAllNotificationsRead } from '@/app/dashboard/notifications/actions';

interface NotificationData {
  id: string;
  type: string;
  payload: unknown;
  read_at: string | null;
  created_at: string;
}

interface Props {
  unreadCount: number;
  items: NotificationData[];
}

export function NotificationsPopover({ unreadCount, items }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleMarkAll() {
    startTransition(async () => {
      try {
        await markAllNotificationsRead();
        router.refresh();
      } catch (e) {
        console.error(e);
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={
                unreadCount > 0
                  ? `Notifications (${unreadCount} unread)`
                  : 'Notifications'
              }
            />
          }
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>

      <PopoverContent align="end" sideOffset={8} className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-sm font-medium">Notifications</div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAll}
              disabled={isPending}
              className="h-7 px-2 text-xs"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 p-1">
              {items.map((n) => (
                <NotificationItem
                  key={n.id}
                  id={n.id}
                  type={n.type}
                  payload={n.payload}
                  readAt={n.read_at}
                  createdAt={n.created_at}
                  onClick={() => setOpen(false)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-3 py-2">
          <Link
            href="/dashboard/notifications"
            className="text-xs text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
