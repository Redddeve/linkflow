import { requireUser } from '@/lib/auth';
import { fetchChatsList, fetchActiveUsers } from '@/lib/data/chat';
import { ChatShell } from './components/chat-shell';

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

  return (
    <ChatShell
      chats={chats}
      allUsers={allUsers}
      actorId={actor.id}
      viewerRole={actor.role}
      selected={null}
    />
  );
}
