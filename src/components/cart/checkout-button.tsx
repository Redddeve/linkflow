'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { checkoutCart } from '@/app/dashboard/cart/actions';

interface Props {
  disabled: boolean;
  disabledReason?: string;
  itemCount: number;
}

export function CheckoutButton({ disabled, disabledReason, itemCount }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleCheckout() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await checkoutCart();
        if (!result.success) {
          setError(result.message);
          return;
        }
        setOpen(false);
        router.push(`/dashboard/orders?checked_out=${result.data.orderIds.length}`);
      } catch {
        setError('Something went wrong. Please try again.');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={disabled} title={disabledReason} />}>
        Checkout ({itemCount} item{itemCount !== 1 ? 's' : ''})
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm checkout</DialogTitle>
          <DialogDescription>
            This will create {itemCount} order{itemCount !== 1 ? 's' : ''}. Make sure all publish
            dates are set correctly before proceeding.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCheckout} disabled={isPending}>
            {isPending ? 'Creating orders…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
