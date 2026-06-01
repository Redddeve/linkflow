'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clearReadNotifications } from '@/app/dashboard/notifications/actions';

export function ClearReadButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await clearReadNotifications();
      if (!result.success) {
        console.error('[notifications] clear-read failed', result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      <Trash2 className="h-4 w-4" />
      Clear read
    </Button>
  );
}
