'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { removeFromCart, updateCartItem } from '@/app/dashboard/cart/actions';

interface Props {
  item: {
    id: string;
    site_id: string;
    publish_date: string | null;
    site_domain: string;
    site_status: string;
    site_price_cents: number;
    site_link_type: string;
  };
}

export function CartRow({ item }: Props) {
  const [date, setDate] = useState<string | null>(item.publish_date ?? null);
  const [isPending, startTransition] = useTransition();
  const isUnavailable = item.site_status !== 'Active';

  function handleRemove() {
    startTransition(async () => {
      await removeFromCart({ cartItemId: item.id });
    });
  }

  function handleDateChange(value: string | null) {
    if (!value) return;
    setDate(value);
    startTransition(async () => {
      await updateCartItem({ cartItemId: item.id, publish_date: value });
    });
  }

  return (
    <div className="flex flex-col gap-1 py-3">
      {isUnavailable && (
        <p className="text-xs text-destructive font-medium">
          This site is no longer available. Remove it to continue.
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-start gap-3 min-w-0 sm:flex-1">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{item.site_domain}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {item.site_link_type}
            </p>
          </div>
          {isUnavailable && (
            <Badge variant="destructive" className="shrink-0">
              Unavailable
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive sm:hidden"
            disabled={isPending}
            onClick={handleRemove}
            aria-label="Remove from cart"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <label htmlFor={`date-${item.id}`} className="sr-only">
            Publish date
          </label>
          <DatePicker
            id={`date-${item.id}`}
            value={date}
            onChange={handleDateChange}
            minDate={new Date()}
            disabled={isUnavailable || isPending}
          />
          <p className="text-sm font-medium tabular-nums sm:w-20 sm:text-right">
            {item.site_price_cents > 0
              ? `$${(item.site_price_cents / 100).toFixed(2)}`
              : '—'}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="hidden text-muted-foreground hover:text-destructive sm:inline-flex"
            disabled={isPending}
            onClick={handleRemove}
            aria-label="Remove from cart"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
