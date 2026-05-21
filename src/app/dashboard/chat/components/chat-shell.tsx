import Link from 'next/link';
import clsx from 'clsx';
import { LifeBuoy, MessageSquare, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { ChatFilters } from './chat-filters';
import { CreateChatDialog } from './create-chat-dialog';
import { MessageThread } from './message-thread';
import { MessageInputForm } from './message-input-form';
import { MarkReadOnMount } from './mark-read-on-mount';
import { ChatPoller } from './chat-poller';
import { EditChatDialog } from './edit-chat-dialog';
import { ChangeChatStatusDialog } from './change-chat-status-dialog';
import { OptimisticMessagesProvider } from './optimistic-messages';
import type {
  ChatsListRow,
  ChatParticipant,
  MessageRow,
  ChatCategory,
} from '@/lib/data/chat';
import type { UserRole } from '@/lib/auth';
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

function shouldMaskCategory(viewerRole: UserRole | null, category: ChatCategory) {
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
    if (mask && p.id !== actorId && (p.role === 'Admin' || p.role === 'Manager')) {
      return { id: p.id, displayName: 'Support', initials: 'S', role: null, masked: true };
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

export function ChatShell({ chats, allUsers, actorId, viewerRole, selected }: Props) {
  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-9rem)] min-h-150">
      <PageHeader
        title="Chats"
        description="Direct messages and order rooms."
        actions={<CreateChatDialog users={allUsers} actorId={actorId} />}
        className="mb-0"
      />

      <ChatFilters />

      <Card
        className="flex-1 min-h-0 overflow-hidden p-0 gap-0"
        size="sm"
      >
        <div className="grid h-full grid-cols-1 md:grid-cols-[300px_1fr]">
          <aside className="flex min-h-0 flex-col border-b md:border-b-0 md:border-r">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold text-sm">Conversations</h2>
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

          <section className="flex min-h-0 flex-col bg-background">
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
    return <LifeBuoy className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Support chat" />;
  }
  if (category === 'Sales') {
    return <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Sales chat" />;
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
          const masked = maskParticipants(chat.participants, chat.category, viewerRole, actorId);
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
  const { chat, participants, messages, userMap, isParticipant } = selected;
  const isStandard = chat.category === 'Standard';
  const isActive = chat.status === 'Active';
  const isArchived = chat.status === 'Archived';

  const masked = maskParticipants(participants, chat.category, viewerRole, actorId);
  const hasMasked = masked.some((p) => p.masked);
  const visibleBadges = masked.filter((p) => !p.masked);

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold leading-tight">{chat.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {visibleBadges.map((p) => (
              <Badge key={p.id} variant="outline" className="text-[10px] font-normal">
                {p.displayName}
                {p.role && <span className="ml-1 text-muted-foreground">· {p.role}</span>}
              </Badge>
            ))}
            {hasMasked && (
              <Badge variant="secondary" className="text-[10px] font-normal">
                Support
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground">
              · {participants.length} member{participants.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline">{chat.category}</Badge>
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {chat.status}
          </Badge>
          {isStandard && (
            <EditChatDialog
              chatId={chat.id}
              currentTitle={chat.title}
              currentParticipants={participants}
              allUsers={allUsers}
            />
          )}
          {isStandard && isActive && (
            <ChangeChatStatusDialog chatId={chat.id} action="archive" />
          )}
          {isStandard && isArchived && (
            <ChangeChatStatusDialog chatId={chat.id} action="unarchive" />
          )}
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

        {isParticipant && (
          <div className="border-t bg-muted/30 px-4 py-3">
            <MessageInputForm chatId={chat.id} />
          </div>
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
