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
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { editOrderPublishDate } from '@/app/dashboard/orders/actions';

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
      const result = await editOrderPublishDate({
        orderId,
        publish_date: date,
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setOpen(false);
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
          <DatePicker
            id="publish-date"
            value={date}
            onChange={(v) => setDate(v ?? '')}
            minDate={today}
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
