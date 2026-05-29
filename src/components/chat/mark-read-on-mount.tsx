'use client';

import { useEffect, useRef } from 'react';

interface Props {
  chatId: string;
}

export function MarkReadOnMount({ chatId }: Props) {
  // Guard against React Strict Mode's double-invoke in dev and any incidental
  // re-mount caused by parent revalidation — we only ever want one round-trip
  // per chatId per page lifecycle.
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (firedFor.current === chatId) return;
    firedFor.current = chatId;

    // Fire-and-forget. keepalive lets the request finish even if the user
    // navigates away or closes the tab mid-flight. Server-side this hits the
    // merged `mark_chat_read` RPC which clears messages + chat notifications
    // in one transaction.
    void fetch('/api/chat/mark-read', {
      method: 'POST',
      body: JSON.stringify({ chatId }),
      headers: { 'content-type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  }, [chatId]);

  return null;
}
