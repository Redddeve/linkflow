'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { setSiteStatus } from '@/app/dashboard/sites/actions';
import { VALID_TRANSITIONS, type SiteStatus } from '@/lib/schemas/sites';

interface Props {
  siteId: string;
  currentStatus: SiteStatus;
}

const ACTION_LABELS: Record<string, string> = {
  APPROVE: 'Approve',
  ARCHIVE: 'Archive',
  REACTIVATE: 'Reactivate',
};

const ACTION_VARIANTS: Record<string, 'default' | 'destructive' | 'outline'> = {
  APPROVE: 'default',
  ARCHIVE: 'destructive',
  REACTIVATE: 'default',
};

export function StatusActions({ siteId, currentStatus }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const availableActions = (
    Object.keys(VALID_TRANSITIONS) as (keyof typeof VALID_TRANSITIONS)[]
  ).filter((action) => VALID_TRANSITIONS[action].includes(currentStatus));

  async function handleAction(action: string) {
    setError('');
    startTransition(async () => {
      const result = await setSiteStatus(
        siteId,
        action as Parameters<typeof setSiteStatus>[1],
      );
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  if (availableActions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {availableActions.map((action) => (
        <Button
          key={action}
          variant={ACTION_VARIANTS[action]}
          size="sm"
          disabled={isPending}
          onClick={() => handleAction(action)}
        >
          {ACTION_LABELS[action]}
        </Button>
      ))}
      {error && <p className="text-sm text-destructive w-full">{error}</p>}
    </div>
  );
}
