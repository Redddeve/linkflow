import Link from 'next/link';
import { ChevronLeft, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MessageThread } from './message-thread';
import { MessageInputForm } from './message-input-form';
import { MarkReadOnMount } from './mark-read-on-mount';
import { ChatPoller } from './chat-poller';
import { OptimisticMessagesProvider } from './optimistic-messages';
import { RoomDetailsPanel } from './room-details-panel';
import { maskParticipants } from './mask-participants';
import type {
  ChatParticipant,
  MessageRow,
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

export interface SelectedChat {
  chat: ChatRow;
  participants: ChatParticipant[];
  messages: MessageRow[];
  userMap: Record<string, UserInfo>;
  isParticipant: boolean;
  relatedOrder: RelatedOrderSummary | null;
}

interface Props {
  selected: SelectedChat;
  actorId: string;
  viewerRole: UserRole | null;
}

export function ChatConversationPane({
  selected,
  actorId,
  viewerRole,
}: Props) {
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

  // Skip the mark-read network call entirely when the user has no unread
  // messages in this chat. Edge case: stale chat notifications without an
  // unread message will linger until "Clear read" is used or a new message
  // arrives — accepted trade-off for zero round-trips on every revisit.
  const hasUnreadForActor = messages.some(
    (m) => m.created_by_id !== actorId && !m.read_by.includes(actorId),
  );

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4">
        <Link
          href="/dashboard/chat"
          aria-label="Back to chat list"
          className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
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

      {hasUnreadForActor && <MarkReadOnMount chatId={chat.id} />}
      <ChatPoller />
    </>
  );
}
