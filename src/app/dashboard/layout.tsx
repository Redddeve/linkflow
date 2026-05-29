import { requireUser } from '@/lib/features/auth';
import { DashboardShell } from '@/components/dashboard/shell';
import { NotificationsPopover } from '@/components/notifications/notifications-popover';
import { ensureAutoChats } from '@/app/dashboard/chat/actions';
import {
  fetchRecentUnreadNotifications,
  fetchUnreadNotificationCount,
} from '@/lib/data/notifications';
import { fetchTotalUnreadChatCount } from '@/lib/data/chat';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (user.role === 'Client') {
    await ensureAutoChats();
  }

  const [unreadCount, recent, chatUnreadCount] = await Promise.all([
    fetchUnreadNotificationCount(user.id),
    fetchRecentUnreadNotifications(user.id, 6),
    fetchTotalUnreadChatCount(user.id),
  ]);

  return (
    <DashboardShell
      user={user}
      chatUnreadCount={chatUnreadCount}
      notificationsSlot={
        <NotificationsPopover unreadCount={unreadCount} items={recent} />
      }
    >
      {children}
    </DashboardShell>
  );
}
