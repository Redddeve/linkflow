'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { markOrdersPayoutPaid } from '../actions';

export interface EarningsTableRow {
  id: string;
  site_domain: string;
  published_at: string | null;
  publish_date: string;
  payout_cents: number;
  commission_cents: number;
  paid_at: string | null;
  payout_reference: string | null;
  sourcer_name?: string | null;
}

interface Props {
  rows: EarningsTableRow[];
  showSourcer: boolean;
  canMarkPaid: boolean;
}

export function EarningsTable({ rows, showSourcer, canMarkPaid }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const unpaidIds = rows.filter((r) => !r.paid_at).map((r) => r.id);
  const allUnpaidSelected =
    unpaidIds.length > 0 && unpaidIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (unpaidIds.every((id) => prev.has(id))) return new Set();
      return new Set(unpaidIds);
    });
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await markOrdersPayoutPaid({
          orderIds: Array.from(selected),
          payoutReference: reference,
        });
        setDialogOpen(false);
        setSelected(new Set());
        setReference('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  return (
    <div className="space-y-3">
      {canMarkPaid && selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
          <span className="text-sm">
            {selected.size} order{selected.size === 1 ? '' : 's'} selected
          </span>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            Mark paid…
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {canMarkPaid && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allUnpaidSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all unpaid"
                  disabled={unpaidIds.length === 0}
                />
              </TableHead>
            )}
            <TableHead>Site</TableHead>
            {showSourcer && <TableHead>Sourcer</TableHead>}
            <TableHead>Published</TableHead>
            <TableHead>Payout</TableHead>
            <TableHead>Commission</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reference</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.id}
              className="cursor-pointer"
              onClick={() => router.push(`/dashboard/orders/${r.id}`)}
            >
              {canMarkPaid && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={() => toggle(r.id)}
                    disabled={!!r.paid_at}
                    aria-label={`Select ${r.site_domain}`}
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">{r.site_domain}</TableCell>
              {showSourcer && (
                <TableCell className="text-sm">
                  {r.sourcer_name ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
              )}
              <TableCell className="text-sm tabular-nums">
                {r.published_at
                  ? new Date(r.published_at).toLocaleDateString('en-CA')
                  : r.publish_date}
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                ${(r.payout_cents / 100).toFixed(2)}
              </TableCell>
              <TableCell className="text-sm tabular-nums text-muted-foreground">
                ${(r.commission_cents / 100).toFixed(2)}
              </TableCell>
              <TableCell className="text-sm">
                {r.paid_at ? (
                  <span className="rounded-full bg-(--st-live-bg) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-(--st-live-fg)">
                    Paid
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Unpaid
                  </span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {r.payout_reference ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length === 0 && (
        <TableEmptyState
          title="No payouts for this month."
          description="Earnings appear here once orders on your sites are published. Try a different month from the filters above."
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark payouts paid</DialogTitle>
            <DialogDescription>
              Record an external payout reference (transfer ID, invoice number, etc.)
              and mark {selected.size} order{selected.size === 1 ? '' : 's'} as paid.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="payout-reference">Payout reference</Label>
            <Input
              id="payout-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. wise-12345"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || reference.trim().length < 3}
            >
              {isPending ? 'Saving…' : 'Mark paid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
