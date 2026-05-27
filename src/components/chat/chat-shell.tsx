import Link from 'next/link';
import clsx from 'clsx';
import { LifeBuoy, MessageSquare, Sparkles, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { ChatFilters } from './chat-filters';
import { CreateChatDialog } from './create-chat-dialog';
import { MessageThread } from './message-thread';
import { MessageInputForm } from './message-input-form';
import { MarkReadOnMount } from './mark-read-on-mount';
import { ChatPoller } from './chat-poller';
import { OptimisticMessagesProvider } from './optimistic-messages';
import { RoomDetailsPanel } from './room-details-panel';
import type {
  ChatsListRow,
  ChatParticipant,
  MessageRow,
  ChatCategory,
  RelatedOrderSummary,
} from '@/lib/data/chat';
import type { UserRole } from '@/lib/features/auth';
import type { Database } from '@/types/database.types';

type ChatRow = Database['public']['Tables']['chats']['Row'];

interface UserInfo {
  first_name: string;
  last_name: string;
  role: UserRole | null;
}

interface SelectedChat {
  chat: ChatRow;
  participants: ChatParticipant[];
  messages: MessageRow[];
  userMap: Record<string, UserInfo>;
  isParticipant: boolean;
  relatedOrder: RelatedOrderSummary | null;
}

interface Props {
  chats: ChatsListRow[];
  allUsers: ChatParticipant[];
  actorId: string;
  viewerRole: UserRole | null;
  selected: SelectedChat | null;
}

interface MaskedParticipant {
  id: string;
  displayName: string;
  initials: string;
  role: UserRole | null;
  masked: boolean;
}

function shouldMaskCategory(
  viewerRole: UserRole | null,
  category: ChatCategory,
) {
  return (
    viewerRole === 'Client' && (category === 'Support' || category === 'Sales')
  );
}

function maskParticipants(
  participants: ChatParticipant[],
  category: ChatCategory,
  viewerRole: UserRole | null,
  actorId: string,
): MaskedParticipant[] {
  const mask = shouldMaskCategory(viewerRole, category);
  return participants.map((p) => {
    if (
      mask &&
      p.id !== actorId &&
      (p.role === 'Admin' || p.role === 'Manager')
    ) {
      return {
        id: p.id,
        displayName: 'Support',
        initials: 'S',
        role: null,
        masked: true,
      };
    }
    return {
      id: p.id,
      displayName: `${p.first_name} ${p.last_name}`,
      initials: `${p.first_name[0] ?? ''}${p.last_name[0] ?? ''}`.toUpperCase(),
      role: p.role,
      masked: false,
    };
  });
}

export function ChatShell({
  chats,
  allUsers,
  actorId,
  viewerRole,
  selected,
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
              <EmptyState />
            )}
          </section>
        </div>
      </Card>
    </div>
  );
}

function CategoryIcon({ category }: { category: ChatCategory }) {
  if (category === 'Support') {
    return (
      <LifeBuoy
        className="h-3.5 w-3.5 shrink-0 text-primary"
        aria-label="Support chat"
      />
    );
  }
  if (category === 'Sales') {
    return (
      <Sparkles
        className="h-3.5 w-3.5 shrink-0 text-primary"
        aria-label="Sales chat"
      />
    );
  }
  return null;
}

function ChatListPane({
  chats,
  selectedId,
  viewerRole,
  actorId,
}: {
  chats: ChatsListRow[];
  selectedId: string | null;
  viewerRole: UserRole | null;
  actorId: string;
}) {
  if (!chats.length) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground">
        No chats found.
      </div>
    );
  }

  const isClient = viewerRole === 'Client';

  return (
    <nav className="flex-1 overflow-y-auto">
      <ul className="divide-y">
        {chats.map((chat) => {
          const isSelected = chat.id === selectedId;
          const masked = maskParticipants(
            chat.participants,
            chat.category,
            viewerRole,
            actorId,
          );
          const seen = new Set<string>();
          const subtitle =
            masked
              .filter((p) => {
                if (!seen.has(p.displayName)) {
                  seen.add(p.displayName);
                  return true;
                }
                return false;
              })
              .map((p) => p.displayName)
              .join(', ') || '—';
          return (
            <li key={chat.id}>
              <Link
                href={`/dashboard/chat/${chat.id}`}
                className={clsx(
                  'block px-4 py-3 transition-colors',
                  isSelected
                    ? 'bg-primary-soft/60 shadow-[inset_2px_0_0_var(--primary)]'
                    : 'hover:bg-muted/60',
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={clsx(
                      'flex items-center gap-1.5 min-w-0 truncate text-sm',
                      isSelected
                        ? 'font-semibold text-primary-text'
                        : 'font-medium',
                    )}
                  >
                    {isClient && <CategoryIcon category={chat.category} />}
                    <span className="truncate">{chat.title}</span>
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {chat.category}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {subtitle}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function ChatConversationPane({
  selected,
  allUsers,
  actorId,
  viewerRole,
}: {
  selected: SelectedChat;
  allUsers: ChatParticipant[];
  actorId: string;
  viewerRole: UserRole | null;
}) {
  const { chat, participants, messages, userMap, isParticipant, relatedOrder } =
    selected;

  const masked = maskParticipants(
    participants,
    chat.category,
    viewerRole,
    actorId,
  );
  const visibleCount = masked.filter((p) => !p.masked).length;
  const hasMasked = masked.some((p) => p.masked);
  const memberCount = visibleCount + (hasMasked ? 1 : 0);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold leading-tight">{chat.title}</h2>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" aria-hidden />
            <span>
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline">{chat.category}</Badge>
          <RoomDetailsPanel
            chat={chat}
            participants={participants}
            allUsers={allUsers}
            actorId={actorId}
            viewerRole={viewerRole}
            relatedOrder={relatedOrder}
          />
        </div>
      </header>

      <OptimisticMessagesProvider>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <MessageThread
            messages={messages}
            userMap={userMap}
            actorId={actorId}
            participants={participants}
            viewerRole={viewerRole}
            chatCategory={chat.category}
          />
        </div>

        {chat.status === 'Archived' ? (
          <div className="border-t bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground">
            This chat is archived. Unarchive it to send new messages.
          </div>
        ) : (
          isParticipant && (
            <div className="border-t bg-muted/30 px-4 py-3">
              <MessageInputForm chatId={chat.id} />
            </div>
          )
        )}
      </OptimisticMessagesProvider>

      <MarkReadOnMount chatId={chat.id} />
      <ChatPoller />
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary-text">
        <MessageSquare className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">Pick a conversation</p>
        <p className="text-sm text-muted-foreground">
          Select a chat from the list to view messages, or start a new one.
        </p>
      </div>
    </div>
  );
}
