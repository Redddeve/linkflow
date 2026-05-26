'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  addOrdersToInvoice,
  removeOrdersFromInvoice,
} from '../../../app/dashboard/invoices/actions';

interface AttachedOrder {
  id: string;
  site_domain: string;
  publish_date: string | null;
  price_cents: number;
}

interface AvailableOrder {
  id: string;
  site_domain: string;
  publish_date: string | null;
  price_cents: number;
}

interface Props {
  invoiceId: string;
  orders: AttachedOrder[];
  availableOrders: AvailableOrder[];
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function EditOrdersDialog({
  invoiceId,
  orders,
  availableOrders,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toAdd, setToAdd] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
  }

  function toggleAdd(id: string) {
    setToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleRemove(orderId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await removeOrdersFromInvoice({ invoiceId, orderIds: [orderId] });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  function handleAdd() {
    if (toAdd.size === 0) return;
    setError(null);
    const ids = Array.from(toAdd);
    startTransition(async () => {
      try {
        await addOrdersToInvoice({ invoiceId, orderIds: ids });
        setToAdd(new Set());
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Edit orders
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage invoice orders</DialogTitle>
          <DialogDescription>
            Add or remove Published orders from this Draft invoice.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">
            Attached orders ({orders.length})
          </h3>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No orders on this invoice yet.
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="grid grid-cols-[1fr_auto] gap-3 items-center border-b pb-3"
                >
                  <div>
                    <p className="text-sm font-medium">{o.site_domain}</p>
                    <p className="text-xs text-muted-foreground">
                      Published {o.publish_date ?? '—'} ·{' '}
                      {formatPrice(o.price_cents)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(o.id)}
                    disabled={isPending}
                    aria-label={`Remove ${o.site_domain}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <Separator />

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">
            Available to add ({availableOrders.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Published orders from the same client, same billing month, not yet
            attached to an invoice.
          </p>
          {availableOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No eligible orders to add.
            </p>
          ) : (
            <div className="space-y-2">
              {availableOrders.map((o) => (
                <label
                  key={o.id}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox
                    checked={toAdd.has(o.id)}
                    onCheckedChange={() => toggleAdd(o.id)}
                    aria-label={`Add ${o.site_domain}`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{o.site_domain}</p>
                    <p className="text-xs text-muted-foreground">
                      Published {o.publish_date ?? '—'} ·{' '}
                      {formatPrice(o.price_cents)}
                    </p>
                  </div>
                </label>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAdd}
                disabled={isPending || toAdd.size === 0}
              >
                {isPending ? 'Adding…' : `Add ${toAdd.size || ''} selected`}
              </Button>
            </div>
          )}
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={isPending}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
