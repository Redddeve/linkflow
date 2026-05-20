import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

type ChatRow = Database['public']['Tables']['chats']['Row'];
type ChatCategory = Database['public']['Enums']['chat_category'];
type ChatStatus = Database['public']['Enums']['chat_status'];

export type { ChatCategory, ChatStatus };

export interface ChatParticipant {
  id: string;
  first_name: string;
  last_name: string;
}

export interface ChatsListRow extends ChatRow {
  participants: ChatParticipant[];
}

export interface ChatsListFilters {
  userId?: string;
  status?: string;
}

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
  actorId: string,
): Promise<ChatsListRow[]> {
  const supabase = await createClient();

  // Fetch chats where actor is a participant
  const { data: participantRows } = await supabase
    .from('chat_participants')
    .select('chat_id')
    .eq('user_id', actorId);

  const chatIds = (participantRows ?? []).map((r) => r.chat_id);
  if (!chatIds.length) return [];

  let query = supabase
    .from('chats')
    .select('*')
    .in('id', chatIds)
    .order('created_at', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status as ChatStatus);

  const { data: chats } = await query;
  if (!chats?.length) return [];

  // Fetch all participants for these chats
  let participantsQuery = supabase
    .from('chat_participants')
    .select('chat_id, user_id')
    .in('chat_id', chats.map((c) => c.id));

  if (filters.userId) participantsQuery = participantsQuery.eq('user_id', filters.userId);

  const { data: allParticipants } = await participantsQuery;

  // Filter chats when userId filter applied (only chats that have that participant)
  const visibleChatIds = filters.userId
    ? new Set((allParticipants ?? []).map((p) => p.chat_id))
    : null;

  const filteredChats = visibleChatIds
    ? chats.filter((c) => visibleChatIds.has(c.id))
    : chats;

  if (!filteredChats.length) return [];

  // Fetch user info for all participant user_ids
  const userIds = [...new Set((allParticipants ?? []).map((p) => p.user_id))];
  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .in('id', userIds);

  const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]));
  const participantsByChat: Record<string, ChatParticipant[]> = {};
  for (const p of allParticipants ?? []) {
    const u = userMap[p.user_id];
    if (!u) continue;
    if (!participantsByChat[p.chat_id]) participantsByChat[p.chat_id] = [];
    participantsByChat[p.chat_id].push(u);
  }

  return filteredChats.map((chat) => ({
    ...chat,
    participants: participantsByChat[chat.id] ?? [],
  }));
}

export async function fetchChatById(id: string) {
  const supabase = await createClient();
  return supabase.from('chats').select('*').eq('id', id).single();
}

export async function fetchChatParticipants(chatId: string): Promise<ChatParticipant[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('chat_participants')
    .select('user_id')
    .eq('chat_id', chatId);

  if (!rows?.length) return [];

  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .in('id', rows.map((r) => r.user_id));

  return users ?? [];
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

export async function fetchOrderChatId(orderId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select('chat_id')
    .eq('id', orderId)
    .single();
  return data?.chat_id ?? null;
}

export async function fetchActiveUsers(): Promise<ChatParticipant[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('status', 'ACTIVE')
    .order('first_name');
  return data ?? [];
}
