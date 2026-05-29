import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/features/auth';
import {
  fetchChatById,
  fetchChatParticipants,
  fetchChatMessages,
  fetchOrderByChatId,
} from '@/lib/data/chat';
import { fetchUsersByIds } from '@/lib/data/users';
import { ChatConversationPane } from '@/components/chat/chat-conversation-pane';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatDetailPage({ params }: PageProps) {
  const { id } = await params;
  const actor = await requireUser();

  const { data: chat, error } = await fetchChatById(id);
  if (error || !chat) notFound();

  const [participants, messages, relatedOrder] = await Promise.all([
    fetchChatParticipants(id),
    fetchChatMessages(id),
    fetchOrderByChatId(id),
  ]);

  const isParticipant = participants.some((p) => p.id === actor.id);
  const isManagerOrAdmin = actor.role === 'Manager' || actor.role === 'Admin';
  if (!isParticipant && !isManagerOrAdmin) notFound();

  // Seed the userMap from the participants we already loaded; only hit the DB
  // for message authors that aren't current participants (rare — e.g. former
  // members who left the chat but whose messages remain).
  const userMap: Record<
    string,
    { first_name: string; last_name: string; role: typeof actor.role }
  > = Object.fromEntries(
    participants.map((p) => [
      p.id,
      { first_name: p.first_name, last_name: p.last_name, role: p.role },
    ]),
  );
  const missingAuthorIds = [
    ...new Set(
      messages
        .map((m) => m.created_by_id)
        .filter((id) => !userMap[id]),
    ),
  ];
  if (missingAuthorIds.length) {
    const extras = await fetchUsersByIds(missingAuthorIds);
    for (const u of extras) {
      userMap[u.id] = {
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role,
      };
    }
  }

  return (
    <ChatConversationPane
      selected={{
        chat,
        participants,
        messages,
        userMap,
        isParticipant,
        relatedOrder,
      }}
      actorId={actor.id}
      viewerRole={actor.role}
    />
  );
}
