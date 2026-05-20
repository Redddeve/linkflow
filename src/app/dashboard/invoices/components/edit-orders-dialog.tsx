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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { reassignOrders } from '../actions';

interface OrderInput {
  id: string;
  site_domain: string;
  publish_date: string | null;
  price_cents: number;
  billing_month: string;
}

interface Props {
  orders: OrderInput[];
}

function toMonthInput(month: string): string {
  return month.slice(0, 7);
}

function fromMonthInput(value: string): string {
  return `${value}-01`;
}

export function EditOrdersDialog({ orders }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(orders.map((o) => [o.id, toMonthInput(o.billing_month)])),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    const changes = orders
      .filter((o) => fromMonthInput(drafts[o.id]) !== o.billing_month)
      .map((o) => ({ orderId: o.id, billing_month: fromMonthInput(drafts[o.id]) }));

    if (changes.length === 0) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      try {
        // Single atomic batch — the server-side PL/pgSQL function does all moves,
        // recomputes totals, creates any corrective Drafts, and deletes emptied
        // source Drafts in one transaction.
        await reassignOrders({ changes });
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Edit orders</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit order billing months</DialogTitle>
          <DialogDescription>
            Reassign individual orders to a different billing period. Moving an order into a month
            whose invoice has already been Sent or Paid creates a new corrective Draft invoice for
            that period (FR-INV-5). All changes are applied as a single transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-end border-b pb-3">
              <div>
                <p className="text-sm font-medium">{o.site_domain}</p>
                <p className="text-xs text-muted-foreground">
                  Published {o.publish_date ?? '—'} · ${(o.price_cents / 100).toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`bm-${o.id}`} className="text-xs">Billing month</Label>
                <Input
                  id={`bm-${o.id}`}
                  type="month"
                  value={drafts[o.id]}
                  onChange={(e) => setDrafts({ ...drafts, [o.id]: e.target.value })}
                  className="w-40"
                />
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
