'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { markAllNotificationsRead } from '@/app/dashboard/notifications/actions';

export function MarkAllReadButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (!result.success) {
        console.error('[notifications] mark-all-read failed', result.message);
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
      <CheckCheck className="h-4 w-4" />
      Mark all read
    </Button>
  );
}
