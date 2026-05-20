import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrderStatusBadge } from './order-status-badge';
import type { Database } from '@/types/database.types';

type OrderStatus = Database['public']['Enums']['order_status'];

export interface OrderRow {
  id: string;
  site_domain: string;
  status: OrderStatus;
  price_cents: number;
  publish_date: string;
  created_at: string;
  copywriter?: { first_name: string; last_name: string } | null;
  manager?: { first_name: string; last_name: string } | null;
}

interface Props {
  orders: OrderRow[];
  showCopywriter?: boolean;
  showManager?: boolean;
}

export function OrdersTable({ orders, showCopywriter = false, showManager = false }: Props) {
  if (orders.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No orders found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Site</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Publish date</TableHead>
          <TableHead>Price</TableHead>
          {showCopywriter && <TableHead>Copywriter</TableHead>}
          {showManager && <TableHead>Manager</TableHead>}
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell>
              <Link href={`/dashboard/orders/${order.id}`} className="font-medium hover:underline">
                {order.site_domain}
              </Link>
            </TableCell>
            <TableCell>
              <OrderStatusBadge status={order.status} />
            </TableCell>
            <TableCell className="text-sm tabular-nums">{order.publish_date}</TableCell>
            <TableCell className="text-sm tabular-nums">
              ${(order.price_cents / 100).toFixed(2)}
            </TableCell>
            {showCopywriter && (
              <TableCell className="text-sm">
                {order.copywriter
                  ? `${order.copywriter.first_name} ${order.copywriter.last_name}`
                  : <span className="text-muted-foreground">Unassigned</span>}
              </TableCell>
            )}
            {showManager && (
              <TableCell className="text-sm">
                {order.manager
                  ? `${order.manager.first_name} ${order.manager.last_name}`
                  : <span className="text-muted-foreground">—</span>}
              </TableCell>
            )}
            <TableCell className="text-sm text-muted-foreground">
              {new Date(order.created_at).toLocaleDateString('en-CA')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
