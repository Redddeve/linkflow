import { Badge } from '@/components/ui/badge';
import type { Database } from '@/types/database.types';

type InvoiceStatus = Database['public']['Enums']['invoice_status'];

type Variant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';

function statusVariant(status: InvoiceStatus): Variant {
  switch (status) {
    case 'Draft': return 'outline';
    case 'Sent': return 'warning';
    case 'Paid': return 'success';
  }
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge variant={statusVariant(status)}>{status}</Badge>;
}
