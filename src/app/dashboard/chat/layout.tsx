import { requireUser } from '@/lib/features/auth';
import {
  fetchChatsList,
  fetchUnreadCountsByChat,
} from '@/lib/data/chat';
import { PageHeader } from '@/components/ui/page-header';
import { ChatFilters } from '@/components/chat/chat-filters';
import { CreateChatDialog } from '@/components/chat/create-chat-dialog';
import { ChatListPane } from '@/components/chat/chat-list-pane';
import { ChatLayoutClient } from '@/components/chat/chat-layout-client';
import { ChatUnreadHydrator } from '@/components/chat/read-state-provider';

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
      <ChatUnreadHydrator unreadByChat={unreadByChat} />
      <PageHeader
        title="Chats"
        description="Direct messages and order rooms."
        actions={<CreateChatDialog actorId={actor.id} />}
        className="mb-0"
      />

      <ChatLayoutClient
        filters={<ChatFilters />}
        list={
          <>
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
            />
          </>
        }
        conversation={children}
      />
    </div>
  );
}
