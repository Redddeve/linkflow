'use client';

import { usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';

interface Props {
  filters: React.ReactNode;
  list: React.ReactNode;
  conversation: React.ReactNode;
}

/**
 * Adaptive shell for /dashboard/chat.
 *
 * At md+ : filters on top, list and conversation side-by-side as before.
 * At < md: when a chat is open (`/dashboard/chat/<id>`), only the conversation
 *          is visible and the filters + list are hidden. On the index route
 *          (`/dashboard/chat`) only the filters + list are visible.
 */
export function ChatLayoutClient({ filters, list, conversation }: Props) {
  const pathname = usePathname();
  const hasChatOpen = /^\/dashboard\/chat\/[^/]+/.test(pathname);

  return (
    <>
      <div className={hasChatOpen ? 'hidden md:block' : undefined}>
        {filters}
      </div>

      <Card className="flex-1 min-h-0 overflow-hidden p-0! gap-0" size="sm">
        <div className="grid h-full grid-cols-1 md:grid-cols-[300px_1fr]">
          <aside
            className={
              (hasChatOpen ? 'hidden md:flex' : 'flex') +
              ' min-h-0 flex-col border-b md:border-b-0 md:border-r'
            }
          >
            {list}
          </aside>

          <section
            className={
              (hasChatOpen ? 'flex' : 'hidden md:flex') +
              ' min-h-0 flex-col'
            }
          >
            {conversation}
          </section>
        </div>
      </Card>
    </>
  );
}
