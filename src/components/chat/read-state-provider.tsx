'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface PublicCtx {
  /** Effective per-chat unread counts (server values minus local reads). */
  unreadByChat: Record<string, number>;
  /** Effective number of chats with at least one unread message. */
  unreadChatCount: number;
  /**
   * Mark a chat as locally read. The per-chat badge and the nav dot will
   * update immediately; the server reconciles via the keepalive route.
   */
  markChatLocallyRead: (chatId: string) => void;
  /**
   * Internal: chat surface hydrates the provider with the server's
   * per-chat unread map on mount and whenever the layout re-fetches.
   */
  hydrateUnreadByChat: (unread: Record<string, number>) => void;
}

const ReadStateContext = createContext<PublicCtx | null>(null);

export function ChatReadStateProvider({ children }: { children: ReactNode }) {
  const [serverUnread, setServerUnread] = useState<Record<string, number>>({});
  const [locallyReadChats, setLocallyReadChats] = useState<Set<string>>(
    () => new Set(),
  );

  const hydrateUnreadByChat = useCallback((next: Record<string, number>) => {
    setServerUnread(next);
    // A locally-read chat that no longer has unread on the server is no
    // longer "pending reconcile" — drop it so future server pushes work.
    setLocallyReadChats((prev) => {
      if (prev.size === 0) return prev;
      const filtered = new Set<string>();
      for (const id of prev) {
        if ((next[id] ?? 0) > 0) filtered.add(id);
      }
      return filtered.size === prev.size ? prev : filtered;
    });
  }, []);

  const markChatLocallyRead = useCallback((chatId: string) => {
    setLocallyReadChats((prev) => {
      if (prev.has(chatId)) return prev;
      const next = new Set(prev);
      next.add(chatId);
      return next;
    });
  }, []);

  const effective = useMemo(() => {
    const unreadByChat: Record<string, number> = {};
    let unreadChatCount = 0;
    for (const [chatId, count] of Object.entries(serverUnread)) {
      const effectiveCount = locallyReadChats.has(chatId) ? 0 : count;
      unreadByChat[chatId] = effectiveCount;
      if (effectiveCount > 0) unreadChatCount += 1;
    }
    return { unreadByChat, unreadChatCount };
  }, [serverUnread, locallyReadChats]);

  const value = useMemo<PublicCtx>(
    () => ({
      ...effective,
      markChatLocallyRead,
      hydrateUnreadByChat,
    }),
    [effective, markChatLocallyRead, hydrateUnreadByChat],
  );

  return (
    <ReadStateContext.Provider value={value}>
      {children}
    </ReadStateContext.Provider>
  );
}

export function useChatReadState(): PublicCtx {
  const ctx = useContext(ReadStateContext);
  if (!ctx) {
    // Defensive: consumers outside the dashboard tree get a no-op shim.
    return {
      unreadByChat: {},
      unreadChatCount: 0,
      markChatLocallyRead: () => {},
      hydrateUnreadByChat: () => {},
    };
  }
  return ctx;
}

/**
 * Pushes the server-fetched per-chat unread map into the provider so the
 * sidebar / nav can derive optimistic counts from it. Renders nothing.
 */
export function ChatUnreadHydrator({
  unreadByChat,
}: {
  unreadByChat: Record<string, number>;
}) {
  const { hydrateUnreadByChat } = useChatReadState();
  // JSON.stringify is the cheap, stable-shape way to memo a Record<string,number>.
  // Each chat layout render passes a fresh object literal but with the same
  // contents; avoid re-firing the effect when contents haven't changed.
  const key = JSON.stringify(unreadByChat);
  useEffect(() => {
    hydrateUnreadByChat(unreadByChat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hydrateUnreadByChat]);
  return null;
}
