'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { markCommissionsPaid } from '../actions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commissionIds: string[];
  onSuccess?: () => void;
}

export function MarkPaidDialog({ open, onOpenChange, commissionIds, onSuccess }: Props) {
  const router = useRouter();
  const [payoutReference, setPayoutReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      try {
        await markCommissionsPaid({ commissionIds, payoutReference });
        setPayoutReference('');
        onSuccess?.();
        onOpenChange(false);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark {commissionIds.length} commission(s) as paid</DialogTitle>
          <DialogDescription>
            Enter the payout reference (e.g. Wise transfer ID). Only commissions still in
            Payable status will be updated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="payout-ref">Payout reference</Label>
          <Input
            id="payout-ref"
            value={payoutReference}
            onChange={(e) => setPayoutReference(e.target.value)}
            placeholder="PAYOUT-2026-05-001"
            disabled={isPending}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || payoutReference.trim().length < 3}>
            {isPending ? 'Marking…' : 'Mark paid'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
