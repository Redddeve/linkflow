import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';
import type { UserRole } from '@/lib/features/auth';

type ChatRow = Database['public']['Tables']['chats']['Row'];
type ChatCategory = Database['public']['Enums']['chat_category'];
type ChatStatus = Database['public']['Enums']['chat_status'];

export type { ChatCategory, ChatStatus };

export interface ChatParticipant {
  id: string;
  first_name: string;
  last_name: string;
  role: UserRole | null;
}

export interface ChatsListRow extends ChatRow {
  participants: ChatParticipant[];
}

export interface ChatsListFilters {
  q?: string;
  status?: string;
  category?: string;
}

const CLIENT_CATEGORY_RANK: Record<ChatCategory, number> = {
  Support: 0,
  Sales: 1,
  Standard: 2,
};

export interface MessageRow {
  id: string;
  chat_id: string;
  created_at: string;
  created_by_id: string;
  content: string;
  read_by: string[];
}

export async function fetchChatsList(
  filters: ChatsListFilters,
  actor: { id: string; role: UserRole | null },
): Promise<ChatsListRow[]> {
  const supabase = await createClient();

  const { data: participantRows } = await supabase
    .from('chat_participants')
    .select('chat_id')
    .eq('user_id', actor.id);

  const chatIds = (participantRows ?? []).map((r) => r.chat_id);
  if (!chatIds.length) return [];

  let query = supabase
    .from('chats')
    .select('*')
    .in('id', chatIds)
    .order('created_at', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status as ChatStatus);
  if (filters.category)
    query = query.eq('category', filters.category as ChatCategory);

  const { data: chats } = await query;
  if (!chats?.length) return [];

  const { data: allParticipants } = await supabase
    .from('chat_participants')
    .select('chat_id, user_id')
    .in(
      'chat_id',
      chats.map((c) => c.id),
    );

  const userIds = [...new Set((allParticipants ?? []).map((p) => p.user_id))];
  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name, role')
    .in('id', userIds);

  const userMap = Object.fromEntries(
    (users ?? []).map((u) => [u.id, u as ChatParticipant]),
  );
  const participantsByChat: Record<string, ChatParticipant[]> = {};
  for (const p of allParticipants ?? []) {
    const u = userMap[p.user_id];
    if (!u) continue;
    if (!participantsByChat[p.chat_id]) participantsByChat[p.chat_id] = [];
    participantsByChat[p.chat_id].push(u);
  }

  const withParticipants: ChatsListRow[] = chats.map((chat) => ({
    ...chat,
    participants: participantsByChat[chat.id] ?? [],
  }));

  const q = filters.q?.trim().toLowerCase();
  const filtered = q
    ? withParticipants.filter((chat) => {
        if (chat.title.toLowerCase().includes(q)) return true;
        return chat.participants.some((p) =>
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(q),
        );
      })
    : withParticipants;

  if (actor.role === 'Client') {
    filtered.sort((a, b) => {
      const rank =
        CLIENT_CATEGORY_RANK[a.category] - CLIENT_CATEGORY_RANK[b.category];
      if (rank !== 0) return rank;
      return b.created_at.localeCompare(a.created_at);
    });
  }

  return filtered;
}

export async function fetchChatById(id: string) {
  const supabase = await createClient();
  return supabase.from('chats').select('*').eq('id', id).single();
}

export async function fetchChatParticipants(
  chatId: string,
): Promise<ChatParticipant[]> {
  const supabase = await createClient();
  // Single round-trip: embed the users row through the chat_participants FK.
  const { data } = await supabase
    .from('chat_participants')
    .select('users(id, first_name, last_name, role)')
    .eq('chat_id', chatId);

  return (data ?? [])
    .map((r) => r.users)
    .filter((u): u is ChatParticipant => u != null) as ChatParticipant[];
}

export async function fetchChatMessages(chatId: string): Promise<MessageRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('chat_messages')
    .select('id, chat_id, created_at, created_by_id, content, read_by')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });
  return data ?? [];
}

export async function fetchOrderChatId(
  orderId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select('chat_id')
    .eq('id', orderId)
    .single();
  return data?.chat_id ?? null;
}

export interface RelatedOrderSummary {
  id: string;
  site_domain: string;
  status: Database['public']['Enums']['order_status'];
}

export async function fetchOrderByChatId(
  chatId: string,
): Promise<RelatedOrderSummary | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select('id, site_domain, status')
    .eq('chat_id', chatId)
    .maybeSingle();
  return data ?? null;
}

/**
 * Total unread messages across every chat the user participates in. Used for
 * the nav-item dot indicator.
 */
export async function fetchTotalUnreadChatCount(
  actorId: string,
): Promise<number> {
  const supabase = await createClient();

  const { data: participantRows } = await supabase
    .from('chat_participants')
    .select('chat_id')
    .eq('user_id', actorId);

  const chatIds = (participantRows ?? []).map((r) => r.chat_id);
  if (!chatIds.length) return 0;

  const { count } = await supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .in('chat_id', chatIds)
    .neq('created_by_id', actorId)
    .not('read_by', 'cs', `{${actorId}}`);

  return count ?? 0;
}

/**
 * Per-chat unread counts for the supplied chat IDs. Returns a map of chatId
 * → count. Used for the per-thread badge in the chat list.
 */
export async function fetchUnreadCountsByChat(
  actorId: string,
  chatIds: string[],
): Promise<Record<string, number>> {
  if (!chatIds.length) return {};
  const supabase = await createClient();

  const { data } = await supabase
    .from('chat_messages')
    .select('chat_id')
    .in('chat_id', chatIds)
    .neq('created_by_id', actorId)
    .not('read_by', 'cs', `{${actorId}}`);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.chat_id] = (counts[row.chat_id] ?? 0) + 1;
  }
  return counts;
}

export async function fetchActiveUsers(): Promise<ChatParticipant[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id, first_name, last_name, role')
    .eq('status', 'ACTIVE')
    .order('first_name');
  return (data ?? []) as ChatParticipant[];
}
