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
      try {
        await markAllNotificationsRead();
        router.refresh();
      } catch (e) {
        console.error(e);
      }
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
