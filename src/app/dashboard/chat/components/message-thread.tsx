import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { MessageRow } from '@/lib/data/chat';

interface UserInfo {
  first_name: string;
  last_name: string;
}

interface Props {
  messages: MessageRow[];
  userMap: Record<string, UserInfo>;
  actorId: string;
  participants: { id: string; first_name: string; last_name: string }[];
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

function initials(user: UserInfo) {
  return `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase();
}

export function MessageThread({
  messages,
  userMap,
  actorId,
  participants,
}: Props) {
  if (!messages.length) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        No messages yet. Say hello!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg) => {
        const isOwn = msg.created_by_id === actorId;
        const author = userMap[msg.created_by_id];
        const authorName = author
          ? `${author.first_name} ${author.last_name}`
          : 'Unknown';

        const readByNames = participants
          .filter((p) => p.id !== actorId && msg.read_by.includes(p.id))
          .map((p) => `${p.first_name} ${p.last_name}`);

        return (
          <div
            key={msg.id}
            className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {!isOwn && (
              <Avatar className="h-8 w-8 shrink-0 mt-1">
                <AvatarFallback className="bg-primary-soft text-primary-text text-xs">
                  {author ? initials(author) : '?'}
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
              <span className="text-[11px] text-muted-foreground">
                {relativeTime(msg.created_at)}
              </span>
              {isOwn && readByNames.length > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  Read by {readByNames.join(', ')}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
