'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MarkPaidDialog } from './mark-paid-dialog';
import type { Database } from '@/types/database.types';

type CommissionStatus = Database['public']['Enums']['commission_status'];

const STATUS_VARIANT: Record<CommissionStatus, 'secondary' | 'default' | 'outline' | 'destructive'> = {
  ACCRUED: 'secondary',
  PAYABLE: 'default',
  PAID: 'outline',
  REVERSED: 'destructive',
};

export interface CommissionRow {
  id: string;
  order_id: string;
  site_domain: string;
  sourcer_id: string;
  sourcer_name: string | null;
  amount_cents: number;
  status: CommissionStatus;
  accrued_at: string;
  paid_at: string | null;
  payout_reference: string | null;
  retry_count: number;
}

interface Props {
  commissions: CommissionRow[];
  showSourcer?: boolean;
  canMarkPaid?: boolean;
}

export function CommissionsTable({ commissions, showSourcer = false, canMarkPaid = false }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  if (commissions.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No commissions found.</p>;
  }

  const payableIds = commissions.filter((c) => c.status === 'PAYABLE').map((c) => c.id);
  const allPayableSelected =
    payableIds.length > 0 && payableIds.every((id) => selected.has(id));

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (allPayableSelected) setSelected(new Set());
    else setSelected(new Set(payableIds));
  };

  const selectedIds = [...selected];

  return (
    <div className="space-y-3">
      {canMarkPaid && selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-sm">
          <span>{selectedIds.length} selected</span>
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
                <input
                  type="checkbox"
                  aria-label="Select all payable"
                  checked={allPayableSelected}
                  onChange={toggleAll}
                  disabled={payableIds.length === 0}
                />
              </TableHead>
            )}
            <TableHead>Site</TableHead>
            {showSourcer && <TableHead>Sourcer</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Accrued</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Payout ref</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commissions.map((c) => {
            const selectable = canMarkPaid && c.status === 'PAYABLE';
            return (
              <TableRow key={c.id}>
                {canMarkPaid && (
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select commission ${c.id}`}
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                      disabled={!selectable}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Link href={`/dashboard/orders/${c.order_id}`} className="font-medium hover:underline">
                    {c.site_domain}
                  </Link>
                </TableCell>
                {showSourcer && (
                  <TableCell className="text-sm">{c.sourcer_name ?? '—'}</TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                    {c.retry_count > 0 && c.status === 'ACCRUED' && (
                      <span className="text-xs text-muted-foreground">
                        retry {c.retry_count}/3
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  ${(c.amount_cents / 100).toFixed(2)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(c.accrued_at).toLocaleDateString('en-CA')}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.paid_at ? new Date(c.paid_at).toLocaleDateString('en-CA') : '—'}
                </TableCell>
                <TableCell className="text-sm font-mono">{c.payout_reference ?? '—'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {canMarkPaid && (
        <MarkPaidDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          commissionIds={selectedIds}
          onSuccess={() => setSelected(new Set())}
        />
      )}
    </div>
  );
}
