import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import {
  fetchChatById,
  fetchChatParticipants,
  fetchChatMessages,
  fetchActiveUsers,
} from '@/lib/data/chat';
import { fetchUsersByIds } from '@/lib/data/users';
import { BackLink } from '@/components/ui/back-link';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageThread } from '../components/message-thread';
import { MessageInputForm } from '../components/message-input-form';
import { MarkReadOnMount } from '../components/mark-read-on-mount';
import { ChatPoller } from '../components/chat-poller';
import { EditChatDialog } from '../components/edit-chat-dialog';
import { ChangeChatStatusDialog } from '../components/change-chat-status-dialog';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatDetailPage({ params }: PageProps) {
  const { id } = await params;
  const actor = await requireUser();

  const { data: chat, error } = await fetchChatById(id);
  if (error || !chat) notFound();

  const [participants, messages, allUsers] = await Promise.all([
    fetchChatParticipants(id),
    fetchChatMessages(id),
    fetchActiveUsers(),
  ]);

  const isParticipant = participants.some((p) => p.id === actor.id);
  const isManagerOrAdmin = actor.role === 'Manager' || actor.role === 'Admin';
  if (!isParticipant && !isManagerOrAdmin) notFound();

  // Build userMap for all message authors + participants
  const allUserIds = [
    ...new Set([...messages.map((m) => m.created_by_id), ...participants.map((p) => p.id)]),
  ];
  const userRows = await fetchUsersByIds(allUserIds);
  const userMap = Object.fromEntries(userRows.map((u) => [u.id, u]));

  const isStandard = chat.category === 'Standard';
  const isActive = chat.status === 'Active';
  const isArchived = chat.status === 'Archived';

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <BackLink href="/dashboard/chat" label="Chats" />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{chat.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {participants.map((p) => `${p.first_name} ${p.last_name}`).join(', ')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Badge variant="outline">{chat.category}</Badge>
          <Badge variant={isActive ? 'default' : 'secondary'}>{chat.status}</Badge>
          {isStandard && (
            <EditChatDialog
              chatId={id}
              currentTitle={chat.title}
              currentParticipants={participants}
              allUsers={allUsers}
            />
          )}
          {isStandard && isActive && (
            <ChangeChatStatusDialog chatId={id} action="archive" />
          )}
          {isStandard && isArchived && (
            <ChangeChatStatusDialog chatId={id} action="unarchive" />
          )}
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <MessageThread
          messages={messages}
          userMap={userMap}
          actorId={actor.id}
          participants={participants}
        />
      </div>

      {isParticipant && (
        <>
          <Separator />
          <MessageInputForm chatId={id} />
        </>
      )}

      <MarkReadOnMount chatId={id} />
      <ChatPoller />
    </div>
  );
}
