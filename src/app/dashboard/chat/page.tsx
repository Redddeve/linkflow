import { requireUser } from '@/lib/auth';
import { fetchChatsList, fetchActiveUsers } from '@/lib/data/chat';
import { PageHeader } from '@/components/ui/page-header';
import { ChatListView } from './components/chat-list-view';
import { ChatFilters } from './components/chat-filters';
import { CreateChatDialog } from './components/create-chat-dialog';

export const metadata = { title: 'Chats' };

interface PageProps {
  searchParams: Promise<{ user?: string; status?: string }>;
}

export default async function ChatsPage({ searchParams }: PageProps) {
  const { user: userId, status } = await searchParams;
  const actor = await requireUser();

  const [chats, allUsers] = await Promise.all([
    fetchChatsList({ userId, status }, actor.id),
    fetchActiveUsers(),
  ]);

  return (
    <div>
      <PageHeader
        title="Chats"
        description="All your conversations"
        actions={<CreateChatDialog users={allUsers} actorId={actor.id} />}
      />
      <div className="space-y-4">
        <ChatFilters users={allUsers} />
        <ChatListView chats={chats} allUsers={allUsers} />
      </div>
    </div>
  );
}
