import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/features/auth';
import {
  fetchChatById,
  fetchChatsList,
  fetchChatParticipants,
  fetchChatMessages,
  fetchActiveUsers,
  fetchOrderByChatId,
  fetchUnreadCountsByChat,
} from '@/lib/data/chat';
import { fetchUsersByIds } from '@/lib/data/users';
import { ChatShell } from '@/components/chat/chat-shell';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; status?: string; category?: string }>;
}

export default async function ChatDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { q, status, category } = await searchParams;
  const actor = await requireUser();

  const { data: chat, error } = await fetchChatById(id);
  if (error || !chat) notFound();

  const [participants, messages, allUsers, chats, relatedOrder] =
    await Promise.all([
      fetchChatParticipants(id),
      fetchChatMessages(id),
      fetchActiveUsers(),
      fetchChatsList(
        { q, status, category },
        { id: actor.id, role: actor.role },
      ),
      fetchOrderByChatId(id),
    ]);

  const isParticipant = participants.some((p) => p.id === actor.id);
  const isManagerOrAdmin = actor.role === 'Manager' || actor.role === 'Admin';
  if (!isParticipant && !isManagerOrAdmin) notFound();

  const allUserIds = [
    ...new Set([
      ...messages.map((m) => m.created_by_id),
      ...participants.map((p) => p.id),
    ]),
  ];
  const userRows = await fetchUsersByIds(allUserIds);
  const userMap = Object.fromEntries(userRows.map((u) => [u.id, u]));

  // Per-thread unread counts for the chat list panel. The currently selected
  // chat is dropped from the map since opening it will mark its messages read.
  const unreadByChat = await fetchUnreadCountsByChat(
    actor.id,
    chats.map((c) => c.id).filter((cid) => cid !== id),
  );

  return (
    <ChatShell
      chats={chats}
      allUsers={allUsers}
      actorId={actor.id}
      viewerRole={actor.role}
      selected={{
        chat,
        participants,
        messages,
        userMap,
        isParticipant,
        relatedOrder,
      }}
      unreadByChat={unreadByChat}
    />
  );
}
