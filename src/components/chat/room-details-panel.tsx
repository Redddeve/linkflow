'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ExternalLink, Info } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { EditChatDialog } from './edit-chat-dialog';
import { ChangeChatStatusDialog } from './change-chat-status-dialog';
import type {
  ChatParticipant,
  ChatCategory,
  RelatedOrderSummary,
} from '@/lib/data/chat';
import type { UserRole } from '@/lib/features/auth';
import type { Database } from '@/types/database.types';

type ChatRow = Database['public']['Tables']['chats']['Row'];

interface Props {
  chat: ChatRow;
  participants: ChatParticipant[];
  actorId: string;
  viewerRole: UserRole | null;
  relatedOrder: RelatedOrderSummary | null;
}

function shouldMaskCategory(
  viewerRole: UserRole | null,
  category: ChatCategory,
) {
  return (
    viewerRole === 'Client' && (category === 'Support' || category === 'Sales')
  );
}

export function RoomDetailsPanel({
  chat,
  participants,
  actorId,
  viewerRole,
  relatedOrder,
}: Props) {
  const [open, setOpen] = useState(false);

  const isStandard = chat.category === 'Standard';
  const isActive = chat.status === 'Active';
  const isArchived = chat.status === 'Archived';
  const canManage = chat.created_by_id === actorId || viewerRole === 'Admin';
  const mask = shouldMaskCategory(viewerRole, chat.category);

  const members = participants.map((p) => {
    const masked =
      mask && p.id !== actorId && (p.role === 'Admin' || p.role === 'Manager');
    return {
      id: p.id,
      displayName: masked ? 'Support' : `${p.first_name} ${p.last_name}`,
      initials: masked
        ? 'S'
        : `${p.first_name[0] ?? ''}${p.last_name[0] ?? ''}`.toUpperCase(),
      role: masked ? null : p.role,
    };
  });
  const dedupedMembers = (() => {
    const seen = new Set<string>();
    return members.filter((m) => {
      const key = m.displayName + (m.role ?? '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="icon-sm" aria-label="Room details" />
        }
      >
        <Info />
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-sm">
        <SheetHeader className="border-b">
          <SheetTitle>Room details</SheetTitle>
          <SheetDescription className="sr-only">
            View status, type and members of this chat.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <Badge variant={isActive ? 'default' : 'secondary'}>
                {chat.status}
              </Badge>
            </dd>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="font-medium">{chat.category}</dd>
          </dl>

          {relatedOrder && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Related order</h3>
              <Link
                href={`/dashboard/orders/${relatedOrder.id}`}
                className="group flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2.5 transition-colors hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {relatedOrder.site_domain}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {relatedOrder.status}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
              </Link>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              Members ({dedupedMembers.length})
            </h3>
            <ul className="space-y-2">
              {dedupedMembers.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary-soft text-primary-text text-xs">
                        {m.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium">
                      {m.displayName}
                    </span>
                  </div>
                  {m.role && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {m.role}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {isStandard && canManage && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/30 px-4 py-3">
            {isActive && (
              <ChangeChatStatusDialog chatId={chat.id} action="archive" />
            )}
            {isArchived && (
              <ChangeChatStatusDialog chatId={chat.id} action="unarchive" />
            )}
            <EditChatDialog
              chatId={chat.id}
              currentTitle={chat.title}
              currentParticipants={participants}
              creatorId={chat.created_by_id}
              actorId={actorId}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
