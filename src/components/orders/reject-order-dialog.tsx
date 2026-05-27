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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { rejectOrder } from '@/app/dashboard/orders/actions';

interface Props {
  orderId: string;
}

const MIN_CHARS = 20;

export function RejectOrderDialog({ orderId }: Props) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const remaining = MIN_CHARS - comment.length;
  const isValid = comment.length >= MIN_CHARS;

  function handleSubmit() {
    if (!isValid) return;
    setError(null);
    startTransition(async () => {
      try {
        await rejectOrder({ orderId, comment: comment.trim() });
        setOpen(false);
        setComment('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setComment('');
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Request changes
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request changes</DialogTitle>
          <DialogDescription>
            Describe what needs to be changed. The copywriter will be notified.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reject-comment">Feedback</Label>
          <Textarea
            id="reject-comment"
            placeholder="Explain what needs to be improved…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground">
            {remaining > 0
              ? `${remaining} more character${remaining === 1 ? '' : 's'} required`
              : `${comment.length} / 2000`}
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !isValid}>
            {isPending ? 'Sending…' : 'Request changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
