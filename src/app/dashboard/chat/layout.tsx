import { requireUser } from '@/lib/features/auth';
import {
  fetchChatsList,
  fetchUnreadCountsByChat,
} from '@/lib/data/chat';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { ChatFilters } from '@/components/chat/chat-filters';
import { CreateChatDialog } from '@/components/chat/create-chat-dialog';
import { ChatListPane } from '@/components/chat/chat-list-pane';

interface Props {
  children: React.ReactNode;
  searchParams?: Promise<{
    q?: string;
    status?: string;
    category?: string;
  }>;
}

export default async function ChatLayout({ children, searchParams }: Props) {
  const actor = await requireUser();
  const { q, status, category } = (await searchParams) ?? {};

  const chats = await fetchChatsList(
    { q, status, category },
    { id: actor.id, role: actor.role },
  );

  const unreadByChat = await fetchUnreadCountsByChat(
    actor.id,
    chats.map((c) => c.id),
  );

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-9rem)] min-h-150">
      <PageHeader
        title="Chats"
        description="Direct messages and order rooms."
        actions={<CreateChatDialog actorId={actor.id} />}
        className="mb-0"
      />

      <ChatFilters />

      <Card className="flex-1 min-h-0 overflow-hidden p-0! gap-0" size="sm">
        <div className="grid h-full grid-cols-1 md:grid-cols-[300px_1fr]">
          <aside className="flex min-h-0 flex-col border-b md:border-b-0 md:border-r">
            <div className="flex h-14 shrink-0 flex-col justify-center border-b px-4">
              <h2 className="font-semibold leading-tight">Conversations</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {chats.length} chat{chats.length !== 1 ? 's' : ''}
              </p>
            </div>
            <ChatListPane
              chats={chats}
              viewerRole={actor.role}
              actorId={actor.id}
              unreadByChat={unreadByChat}
            />
          </aside>

          <section className="flex min-h-0 flex-col">{children}</section>
        </div>
      </Card>
    </div>
  );
}
