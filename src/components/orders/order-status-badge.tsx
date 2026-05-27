import { Badge } from '@/components/ui/badge';
import type { Database } from '@/types/database.types';

type OrderStatus = Database['public']['Enums']['order_status'];

type Variant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' | 'purple';

function statusVariant(status: OrderStatus): Variant {
  switch (status) {
    case 'New': return 'outline';
    case 'In Progress': return 'default';
    case 'Content Sent': return 'warning';
    case 'Needs changes': return 'purple';
    case 'Content Approved': return 'success';
    case 'Published': return 'success';
    case 'Completed': return 'success';
    case 'Canceled': return 'destructive';
  }
}

export function OrderStatusBadge({
  status,
  className,
  style,
}: {
  status: OrderStatus;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Badge variant={statusVariant(status)} className={className} style={style}>
      {status}
    </Badge>
  );
}
