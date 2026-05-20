import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InvoiceStatusBadge } from './invoice-status-badge';
import { formatBillingMonth } from '@/lib/billing';
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
  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No invoices found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showClient && <TableHead>Client</TableHead>}
          <TableHead>Billing month</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => (
          <TableRow key={inv.id}>
            {showClient && (
              <TableCell className="text-sm">
                {inv.client
                  ? `${inv.client.first_name} ${inv.client.last_name}`
                  : <span className="text-muted-foreground">Unknown</span>}
              </TableCell>
            )}
            <TableCell>
              <Link href={`/dashboard/invoices/${inv.id}`} className="font-medium hover:underline">
                {formatBillingMonth(inv.billing_month)}
              </Link>
            </TableCell>
            <TableCell>
              <InvoiceStatusBadge status={inv.status} />
            </TableCell>
            <TableCell className="text-right text-sm tabular-nums">
              ${(inv.total_price_cents / 100).toFixed(2)}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(inv.created_at).toLocaleDateString('en-CA')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
