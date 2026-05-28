import { requireUser } from '@/lib/features/auth';
import { DashboardShell } from '@/components/dashboard/shell';
import { NotificationsPopover } from '@/components/notifications/notifications-popover';
import { ensureAutoChats } from '@/app/dashboard/chat/actions';
import {
  fetchRecentUnreadNotifications,
  fetchUnreadNotificationCount,
} from '@/lib/data/notifications';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (user.role === 'Client') {
    await ensureAutoChats();
  }

  const [unreadCount, recent] = await Promise.all([
    fetchUnreadNotificationCount(user.id),
    fetchRecentUnreadNotifications(user.id, 10),
  ]);

  return (
    <DashboardShell
      user={user}
      notificationsSlot={
        <NotificationsPopover unreadCount={unreadCount} items={recent} />
      }
    >
      {children}
    </DashboardShell>
  );
}
