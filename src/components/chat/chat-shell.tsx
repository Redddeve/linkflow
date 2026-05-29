import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { ChatFilters } from './chat-filters';
import { CreateChatDialog } from './create-chat-dialog';
import { ChatListPane } from './chat-list-pane';
import {
  ChatConversationPane,
  type SelectedChat,
} from './chat-conversation-pane';
import { ChatEmptyState } from './chat-empty-state';
import type { ChatsListRow, ChatParticipant } from '@/lib/data/chat';
import type { UserRole } from '@/lib/features/auth';

interface Props {
  chats: ChatsListRow[];
  allUsers: ChatParticipant[];
  actorId: string;
  viewerRole: UserRole | null;
  selected: SelectedChat | null;
  unreadByChat?: Record<string, number>;
}

export function ChatShell({
  chats,
  allUsers,
  actorId,
  viewerRole,
  selected,
  unreadByChat = {},
}: Props) {
  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-9rem)] min-h-150">
      <PageHeader
        title="Chats"
        description="Direct messages and order rooms."
        actions={<CreateChatDialog users={allUsers} actorId={actorId} />}
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
              selectedId={selected?.chat.id ?? null}
              viewerRole={viewerRole}
              actorId={actorId}
              unreadByChat={unreadByChat}
            />
          </aside>

          <section className="flex min-h-0 flex-col">
            {selected ? (
              <ChatConversationPane
                selected={selected}
                allUsers={allUsers}
                actorId={actorId}
                viewerRole={viewerRole}
              />
            ) : (
              <ChatEmptyState />
            )}
          </section>
        </div>
      </Card>
    </div>
  );
}
