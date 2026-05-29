'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type {
  MessageRow,
  ChatCategory,
  ChatParticipant,
} from '@/lib/data/chat';
import type { UserRole } from '@/lib/features/auth';
import {
  useOptimisticMessages,
  type OptimisticMessage,
} from './optimistic-messages';

interface UserInfo {
  first_name: string;
  last_name: string;
  role: UserRole | null;
}

interface Props {
  messages: MessageRow[];
  userMap: Record<string, UserInfo>;
  actorId: string;
  participants: ChatParticipant[];
  viewerRole: UserRole | null;
  chatCategory: ChatCategory;
}

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function initials(user: { first_name: string; last_name: string }) {
  return `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase();
}

function isInternalRole(role: UserRole | null | undefined) {
  return role === 'Admin' || role === 'Manager';
}

export function MessageThread({
  messages,
  userMap,
  actorId,
  participants,
  viewerRole,
  chatCategory,
}: Props) {
  const { pending } = useOptimisticMessages();

  const ownContents = new Set(
    messages.filter((m) => m.created_by_id === actorId).map((m) => m.content),
  );
  const visiblePending = pending.filter(
    (p) => p.status === 'failed' || !ownContents.has(p.content),
  );

  if (!messages.length && !visiblePending.length) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        No messages yet. Say hello!
      </p>
    );
  }

  const maskCategory =
    viewerRole === 'Client' &&
    (chatCategory === 'Support' || chatCategory === 'Sales');

  const author = userMap[actorId];
  const ownInitials = author ? initials(author) : '?';

  // Only the LAST of the actor's own messages that has been read by anyone else
  // gets the "Read ✓✓" indicator. Earlier reads are implied.
  let lastReadOwnIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.created_by_id !== actorId) continue;
    if (m.read_by.some((id) => id !== actorId)) {
      lastReadOwnIndex = i;
      break;
    }
  }

  return (
    <div className="space-y-4">
      {messages.map((msg, idx) => {
        const isOwn = msg.created_by_id === actorId;
        const msgAuthor = userMap[msg.created_by_id];
        const maskAuthor =
          maskCategory && !isOwn && isInternalRole(msgAuthor?.role);

        const authorName = maskAuthor
          ? 'Support'
          : msgAuthor
            ? `${msgAuthor.first_name} ${msgAuthor.last_name}`
            : 'Unknown';
        const avatarInitials = maskAuthor
          ? 'S'
          : msgAuthor
            ? initials(msgAuthor)
            : '?';

        const readByNames = participants
          .filter((p) => p.id !== actorId && msg.read_by.includes(p.id))
          .map((p) =>
            maskCategory && isInternalRole(p.role)
              ? 'Support'
              : `${p.first_name} ${p.last_name}`,
          );
        const uniqueReadBy = Array.from(new Set(readByNames));

        return (
          <div
            key={msg.id}
            className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {!isOwn && (
              <Avatar className="h-8 w-8 shrink-0 mt-1">
                <AvatarFallback className="bg-primary-soft text-primary-text text-xs">
                  {avatarInitials}
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={`max-w-[70%] space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}
            >
              {!isOwn && (
                <span className="text-xs font-medium text-muted-foreground">
                  {authorName}
                </span>
              )}
              <div
                className={`rounded-lg px-3 py-2 text-sm wrap-break-word ${
                  isOwn
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {msg.content}
              </div>
              <span className="text-xs text-muted-foreground">
                {relativeTime(msg.created_at)}
              </span>
              {isOwn && idx === lastReadOwnIndex && uniqueReadBy.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  Read ✓✓ {uniqueReadBy.join(', ')}
                </span>
              )}
            </div>
          </div>
        );
      })}
      {visiblePending.map((m) => (
        <PendingBubble key={m.tempId} message={m} initials={ownInitials} />
      ))}
    </div>
  );
}

function PendingBubble({
  message,
  initials,
}: {
  message: OptimisticMessage;
  initials: string;
}) {
  const failed = message.status === 'failed';
  return (
    <div className="flex gap-3 flex-row-reverse">
      <div className="max-w-[70%] space-y-1 items-end flex flex-col">
        <div
          className={`rounded-lg px-3 py-2 text-sm wrap-break-word ${
            failed
              ? 'bg-destructive/10 text-foreground border border-destructive/40'
              : 'bg-primary/70 text-primary-foreground'
          }`}
        >
          {message.content}
        </div>
        <span
          className={`text-xs ${
            failed ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {failed ? (message.error ?? 'Failed to send') : 'Sending…'}
        </span>
      </div>
      <Avatar className="h-8 w-8 shrink-0 mt-1 opacity-0">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
    </div>
  );
}
