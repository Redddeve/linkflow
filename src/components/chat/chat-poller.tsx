'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const FOCUSED_INTERVAL_MS = 5_000;
const HIDDEN_INTERVAL_MS = 30_000;

/**
 * Visibility-aware poller. Refreshes the chat segment only while the chat
 * detail page is mounted. Cadence adapts to tab focus:
 *
 *   - Tab visible + focused: every 5s
 *   - Tab hidden (backgrounded, minimized): every 30s
 *   - Component unmounted (user left chat): no polling
 *
 * Also fires an immediate refresh the moment the tab becomes visible again,
 * so the user sees fresh messages without waiting for the next tick.
 */
export function ChatPoller() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    function currentInterval() {
      return document.visibilityState === 'hidden'
        ? HIDDEN_INTERVAL_MS
        : FOCUSED_INTERVAL_MS;
    }

    function schedule() {
      if (stopped) return;
      timer = setTimeout(tick, currentInterval());
    }

    function tick() {
      if (stopped) return;
      router.refresh();
      schedule();
    }

    function handleVisibilityChange() {
      if (timer) clearTimeout(timer);
      if (document.visibilityState === 'visible') {
        // Catch up immediately when the user returns to the tab.
        router.refresh();
      }
      schedule();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    schedule();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);

  return null;
}
