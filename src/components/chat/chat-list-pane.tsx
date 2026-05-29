'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { CategoryIcon } from './category-icon';
import { maskParticipants } from './mask-participants';
import { useChatReadState } from './read-state-provider';
import type { ChatsListRow } from '@/lib/data/chat';
import type { UserRole } from '@/lib/features/auth';

interface Props {
  chats: ChatsListRow[];
  viewerRole: UserRole | null;
  actorId: string;
}

export function ChatListPane({ chats, viewerRole, actorId }: Props) {
  // Read the effective per-chat unread map from the provider (server values
  // minus any chats the user has locally marked read in this session).
  const { unreadByChat } = useChatReadState();
  const pathname = usePathname();
  const selectedId = pathname.startsWith('/dashboard/chat/')
    ? pathname.slice('/dashboard/chat/'.length).split('/')[0] || null
    : null;
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
          const itemContent = (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={clsx(
                    'flex items-center gap-1.5 min-w-0 truncate text-sm',
                    isSelected ? 'font-semibold text-primary-text' : 'font-medium',
                  )}
                >
                  {isClient && <CategoryIcon category={chat.category} />}
                  <span className="truncate">{chat.title}</span>
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  {unreadByChat[chat.id] ? (
                    <span
                      aria-label={`${unreadByChat[chat.id]} unread`}
                      className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
                    >
                      {unreadByChat[chat.id]! > 99 ? '99+' : unreadByChat[chat.id]}
                    </span>
                  ) : null}
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {chat.category}
                  </span>
                </div>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
            </>
          );
          return (
            <li key={chat.id}>
              {isSelected ? (
                <div
                  aria-current="page"
                  className="block px-4 py-3 bg-primary-soft/60 shadow-[inset_2px_0_0_var(--primary)]"
                >
                  {itemContent}
                </div>
              ) : (
                <Link
                  href={`/dashboard/chat/${chat.id}`}
                  className="block px-4 py-3 transition-colors hover:bg-muted/60"
                >
                  {itemContent}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
