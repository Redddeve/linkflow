import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { EditChatDialog } from './edit-chat-dialog';
import { ChangeChatStatusDialog } from './change-chat-status-dialog';
import type { ChatsListRow, ChatParticipant } from '@/lib/data/chat';

interface Props {
  chats: ChatsListRow[];
  allUsers: ChatParticipant[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ChatListView({ chats, allUsers }: Props) {
  if (!chats.length) {
    return <p className="text-muted-foreground text-sm">No chats found.</p>;
  }

  return (
    <div className="space-y-2">
      {chats.map((chat) => {
        const isStandard = chat.category === 'Standard';
        const isActive = chat.status === 'Active';
        const isArchived = chat.status === 'Archived';

        return (
          <div
            key={chat.id}
            className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <Link
                href={`/dashboard/chat/${chat.id}`}
                className="font-medium hover:text-primary truncate block"
              >
                {chat.title}
              </Link>
              <p className="text-xs text-muted-foreground mt-0.5">
                {chat.participants.map((p) => `${p.first_name} ${p.last_name}`).join(', ')}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline">{chat.category}</Badge>
              <Badge variant={isActive ? 'default' : 'secondary'}>{chat.status}</Badge>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {formatDate(chat.created_at)}
              </span>

              {isStandard && (
                <EditChatDialog
                  chatId={chat.id}
                  currentTitle={chat.title}
                  currentParticipants={chat.participants}
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
          </div>
        );
      })}
    </div>
  );
}
