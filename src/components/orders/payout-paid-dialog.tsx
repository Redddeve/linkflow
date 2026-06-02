'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { setOrderPayoutPaid } from '@/app/dashboard/earnings/actions';

interface Props {
  orderId: string;
  currentlyPaid: boolean;
  currentReference: string | null;
}

interface FormValues {
  payoutReference: string;
}

export function PayoutPaidDialog({
  orderId,
  currentlyPaid,
  currentReference,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { payoutReference: currentReference ?? '' },
  });

  function handleOpenChange(o: boolean) {
    if (!o) {
      reset({ payoutReference: currentReference ?? '' });
      setError(null);
    }
    setOpen(o);
  }

  function markPaid(data: FormValues) {
    setError(null);
    startTransition(async () => {
      const res = await setOrderPayoutPaid({
        orderId,
        paid: true,
        payoutReference: data.payoutReference,
      });
      if (!res.success) {
        setError(res.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function markUnpaid() {
    setError(null);
    startTransition(async () => {
      const res = await setOrderPayoutPaid({ orderId, paid: false });
      if (!res.success) {
        setError(res.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        {currentlyPaid ? 'Mark payout unpaid' : 'Mark payout paid'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {currentlyPaid ? 'Mark payout as unpaid?' : 'Mark payout as paid?'}
          </DialogTitle>
          <DialogDescription>
            {currentlyPaid
              ? 'This clears the payout timestamp and reference. The sourcer will see the row as Unpaid again.'
              : 'Record the payout reference. The sourcer will be notified.'}
          </DialogDescription>
        </DialogHeader>
        {currentlyPaid ? (
          <>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={markUnpaid}
                disabled={isPending}
              >
                {isPending ? 'Saving…' : 'Mark unpaid'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form
            id="payout-paid-form"
            onSubmit={handleSubmit(markPaid)}
            className="grid gap-3"
          >
            <div className="grid gap-2">
              <Label htmlFor="payoutReference">Payout reference</Label>
              <Input
                id="payoutReference"
                placeholder="e.g. PAY-2026-05"
                {...register('payoutReference', {
                  required: 'Required',
                  minLength: { value: 3, message: 'At least 3 characters' },
                  maxLength: { value: 200, message: 'Too long' },
                })}
              />
              {errors.payoutReference && (
                <p className="text-sm text-destructive">
                  {errors.payoutReference.message}
                </p>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Mark paid'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
