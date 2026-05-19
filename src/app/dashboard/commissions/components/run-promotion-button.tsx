'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { promoteCommissions, type PromoteResult } from '../actions';

export function RunPromotionButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<PromoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await promoteCommissions();
        setResult(r);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-xs text-muted-foreground">
          {result.promoted} promoted · {result.retried} retried · {result.reversed} reversed
          {result.errored > 0 ? ` · ${result.errored} errored` : ''}
        </span>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button onClick={handleClick} disabled={isPending} variant="outline" size="sm">
        {isPending ? 'Running…' : 'Run promotion'}
      </Button>
    </div>
  );
}
