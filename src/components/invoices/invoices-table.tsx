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
import { InvoiceStatusBadge } from './invoice-status-badge';
import { formatBillingMonth } from '@/lib/features/billing';
import type { Database } from '@/types/database.types';

type InvoiceStatus = Database['public']['Enums']['invoice_status'];

export interface InvoiceRow {
  id: string;
  client_id: string;
  billing_month: string;
  status: InvoiceStatus;
  total_price_cents: number;
  created_at: string;
  client?: { first_name: string; last_name: string } | null;
}

interface Props {
  invoices: InvoiceRow[];
  showClient?: boolean;
}

export function InvoicesTable({ invoices, showClient = false }: Props) {
  const router = useRouter();

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow theadrow={true}>
            {showClient && <TableHead>Client</TableHead>}
            <TableHead>Billing month</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow
              key={inv.id}
              className="cursor-pointer"
              onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}
            >
              {showClient && (
                <TableCell className="text-sm">
                  {inv.client ? (
                    `${inv.client.first_name} ${inv.client.last_name}`
                  ) : (
                    <span className="text-muted-foreground">Unknown</span>
                  )}
                </TableCell>
              )}
              <TableCell className="font-medium">
                {formatBillingMonth(inv.billing_month)}
              </TableCell>
              <TableCell>
                <InvoiceStatusBadge status={inv.status} />
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                ${(inv.total_price_cents / 100).toFixed(2)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(inv.created_at).toLocaleDateString('en-CA')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {invoices.length === 0 && (
        <TableEmptyState
          title="No invoices found."
          description="Invoices are generated monthly from published orders. Once orders are published, drafts will appear here."
        />
      )}
    </>
  );
}
