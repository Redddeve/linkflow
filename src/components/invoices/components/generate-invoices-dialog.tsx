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
import { addMonths, firstOfMonth } from '@/lib/billing';
import { generateInvoicesForMonth } from '../../../app/dashboard/invoices/actions';

function defaultPriorMonthInput(): string {
  return addMonths(firstOfMonth(new Date()), -1).slice(0, 7);
}

export function GenerateInvoicesDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<string>(defaultPriorMonthInput);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const res = await generateInvoicesForMonth({
          billing_month: `${month}-01`,
        });
        setResult(res);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Generate invoices
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Draft invoices</DialogTitle>
          <DialogDescription>
            Creates one Draft invoice per client for every Published order with
            the chosen billing month that isn&apos;t already invoiced. Safe to
            re-run — orders are attached to an existing Draft if one is present.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="gen-month">Billing month</Label>
          <Input
            id="gen-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && (
          <p className="text-sm text-muted-foreground">
            {result.created} new Draft{result.created === 1 ? '' : 's'} created;{' '}
            {result.updated} existing Draft{result.updated === 1 ? '' : 's'}{' '}
            updated with new orders.
          </p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Close
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !month}>
            {isPending ? 'Generating…' : 'Generate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
