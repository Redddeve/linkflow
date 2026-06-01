'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { startOrderChat } from '@/app/dashboard/chat/actions';

interface Props {
  orderId: string;
  existingChatId: string | null;
}

export function StartChatButton({ orderId, existingChatId }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (existingChatId) {
    return (
      <Link
        href={`/dashboard/chat/${existingChatId}`}
        className={buttonVariants({ size: 'sm', variant: 'outline' })}
      >
        Open chat
      </Link>
    );
  }

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await startOrderChat({ orderId });
        if (!result.success) {
          setError(result.message);
          return;
        }
        router.push(`/dashboard/chat/${result.data.chatId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? 'Starting…' : 'Start chat'}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
