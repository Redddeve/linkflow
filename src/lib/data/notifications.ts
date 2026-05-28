import { createClient } from '@/lib/supabase/server';

export interface NotificationRow {
  id: string;
  type: string;
  payload: unknown;
  channel: 'IN_APP' | 'EMAIL' | 'BOTH';
  read_at: string | null;
  created_at: string;
}

export async function fetchNotifications(
  recipientId: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<{ rows: NotificationRow[]; total: number; unread: number }> {
  const supabase = await createClient();
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [list, unreadCount] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, type, payload, channel, read_at, created_at', {
        count: 'exact',
      })
      .eq('recipient_id', recipientId)
      .order('read_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false })
      .range(from, to),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', recipientId)
      .is('read_at', null),
  ]);

  return {
    rows: (list.data ?? []) as NotificationRow[],
    total: list.count ?? 0,
    unread: unreadCount.count ?? 0,
  };
}

export async function fetchUnreadNotificationCount(
  recipientId: string,
): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', recipientId)
    .is('read_at', null);
  return count ?? 0;
}

export async function fetchRecentUnreadNotifications(
  recipientId: string,
  limit = 10,
): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('notifications')
    .select('id, type, payload, channel, read_at, created_at')
    .eq('recipient_id', recipientId)
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as NotificationRow[];
}
