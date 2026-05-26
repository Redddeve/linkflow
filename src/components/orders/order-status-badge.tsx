import { Badge } from '@/components/ui/badge';
import type { Database } from '@/types/database.types';

type OrderStatus = Database['public']['Enums']['order_status'];

type Variant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';

function statusVariant(status: OrderStatus): Variant {
  switch (status) {
    case 'New': return 'outline';
    case 'In Progress': return 'default';
    case 'Content Sent': return 'warning';
    case 'Needs changes': return 'destructive';
    case 'Content Approved': return 'success';
    case 'Published': return 'success';
    case 'Completed': return 'success';
    case 'Canceled': return 'secondary';
  }
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={statusVariant(status)}>{status}</Badge>;
}
