'use client';

import { useEffect, useRef } from 'react';
import { useChatReadState } from './read-state-provider';

interface Props {
  chatId: string;
}

export function MarkReadOnMount({ chatId }: Props) {
  // Guard against React Strict Mode's double-invoke in dev and any incidental
  // re-mount caused by parent revalidation — we only ever want one round-trip
  // per chatId per page lifecycle.
  const firedFor = useRef<string | null>(null);
  const { markChatLocallyRead } = useChatReadState();

  useEffect(() => {
    if (firedFor.current === chatId) return;
    firedFor.current = chatId;

    // 1. Optimistic: tell the provider the chat is read so the sidebar
    //    badge, the nav dot, and any other chrome update immediately.
    markChatLocallyRead(chatId);

    // 2. Fire-and-forget the server-side mark-read. keepalive lets the
    //    request finish even if the user navigates away mid-flight.
    //    Server-side this hits the merged `mark_chat_read` RPC which
    //    clears messages + chat notifications in one transaction.
    void fetch('/api/chat/mark-read', {
      method: 'POST',
      body: JSON.stringify({ chatId }),
      headers: { 'content-type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  }, [chatId, markChatLocallyRead]);

  return null;
}
