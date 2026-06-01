'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { approveOrder } from '@/app/dashboard/orders/actions';

interface Props {
  orderId: string;
}

export function ApproveOrderDialog({ orderId }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveOrder({ orderId });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Approve</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve content</DialogTitle>
          <DialogDescription>
            Confirm that the content meets your requirements. The manager will
            be notified to publish.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={isPending}>
            {isPending ? 'Approving…' : 'Approve content'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
