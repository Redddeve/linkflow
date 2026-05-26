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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { editOrderPublishDate } from '../../../app/dashboard/orders/actions';

interface Props {
  orderId: string;
  currentDate: string;
}

export function EditPublishDateDialog({ orderId, currentDate }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(currentDate);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await editOrderPublishDate({ orderId, publish_date: date });
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Edit publish date
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit publish date</DialogTitle>
          <DialogDescription>
            Choose a new publish date. Must be today or a future date.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="publish-date">Publish date</Label>
          <Input
            id="publish-date"
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
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
          <Button onClick={handleSubmit} disabled={isPending || !date}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
