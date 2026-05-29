import { requireUser } from '@/lib/features/auth';
import {
  fetchChatsList,
  fetchActiveUsers,
  fetchUnreadCountsByChat,
} from '@/lib/data/chat';
import { ChatShell } from '@/components/chat/chat-shell';

export const metadata = { title: 'Chats' };

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; category?: string }>;
}

export default async function ChatsPage({ searchParams }: PageProps) {
  const { q, status, category } = await searchParams;
  const actor = await requireUser();

  const [chats, allUsers] = await Promise.all([
    fetchChatsList({ q, status, category }, { id: actor.id, role: actor.role }),
    fetchActiveUsers(),
  ]);

  const unreadByChat = await fetchUnreadCountsByChat(
    actor.id,
    chats.map((c) => c.id),
  );

  return (
    <ChatShell
      chats={chats}
      allUsers={allUsers}
      actorId={actor.id}
      viewerRole={actor.role}
      selected={null}
      unreadByChat={unreadByChat}
    />
  );
}
