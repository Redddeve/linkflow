'use client';

import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableEmptyState } from '@/components/ui/table-empty-state';

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
  rowClickable?: boolean;
}

export function EarningsTable({
  rows,
  showSourcer,
  rowClickable = true,
}: Props) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow clickable={false}>
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
              className={rowClickable ? 'cursor-pointer' : undefined}
              clickable={rowClickable}
              onClick={
                rowClickable
                  ? () => router.push(`/dashboard/orders/${r.id}`)
                  : undefined
              }
            >
              <TableCell className="font-medium">{r.site_domain}</TableCell>
              {showSourcer && (
                <TableCell className="text-sm">
                  {r.sourcer_name ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
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
    </div>
  );
}
