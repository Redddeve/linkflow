import { requireUser } from '@/lib/features/auth';
import { DashboardShell } from '@/components/dashboard/shell';
import { NotificationsPopover } from '@/components/notifications/notifications-popover';
import { ChatReadStateProvider } from '@/components/chat/read-state-provider';
import { ensureAutoChats } from '@/app/dashboard/chat/actions';
import {
  fetchRecentUnreadNotifications,
  fetchUnreadNotificationCount,
} from '@/lib/data/notifications';
import { fetchTotalUnreadChatCount } from '@/lib/data/chat';
import { fetchCartItemCount } from '@/lib/data/cart';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (user.role === 'Client') {
    await ensureAutoChats();
  }

  const [unreadCount, recent, chatUnreadCount, cartItemCount] =
    await Promise.all([
      fetchUnreadNotificationCount(user.id),
      fetchRecentUnreadNotifications(user.id, 6),
      fetchTotalUnreadChatCount(user.id),
      user.role === 'Client' ? fetchCartItemCount(user.id) : Promise.resolve(0),
    ]);

  return (
    <ChatReadStateProvider>
      <DashboardShell
        user={user}
        chatUnreadCount={chatUnreadCount}
        cartItemCount={cartItemCount}
        notificationsSlot={
          <NotificationsPopover unreadCount={unreadCount} items={recent} />
        }
      >
        {children}
      </DashboardShell>
    </ChatReadStateProvider>
  );
}
