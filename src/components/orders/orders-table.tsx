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
  client?: { first_name: string; last_name: string } | null;
  sourcer_payout_cents?: number | null;
  sourcer_paid_at?: string | null;
}

interface Props {
  orders: OrderRow[];
  showCopywriter?: boolean;
  showManager?: boolean;
  showPrice?: boolean;
  showPayout?: boolean;
}

export function OrdersTable({
  orders,
  showCopywriter = false,
  showManager = false,
  showPrice = true,
  showPayout = false,
}: Props) {
  const router = useRouter();

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow theadrow={true}>
            <TableHead>Site</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Publish date</TableHead>
            {showPrice && <TableHead>Price</TableHead>}
            {showPayout && <TableHead>Payout</TableHead>}
            {showCopywriter && <TableHead>Copywriter</TableHead>}
            {showManager && <TableHead>Manager</TableHead>}
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order.id}
              className="cursor-pointer"
              onClick={() => router.push(`/dashboard/orders/${order.id}`)}
            >
              <TableCell className="font-medium">{order.site_domain}</TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell className="text-sm tabular-nums">
                {order.publish_date}
              </TableCell>
              {showPrice && (
                <TableCell className="text-sm tabular-nums">
                  ${(order.price_cents / 100).toFixed(2)}
                </TableCell>
              )}
              {showPayout && (
                <TableCell className="text-sm tabular-nums">
                  {order.sourcer_payout_cents != null ? (
                    <span className="inline-flex items-center gap-2">
                      ${(order.sourcer_payout_cents / 100).toFixed(2)}
                      <span
                        className={
                          order.sourcer_paid_at
                            ? 'rounded-full bg-(--st-live-bg) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-(--st-live-fg)'
                            : 'rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'
                        }
                      >
                        {order.sourcer_paid_at ? 'Paid' : 'Unpaid'}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              )}
              {showCopywriter && (
                <TableCell className="text-sm">
                  {order.copywriter ? (
                    `${order.copywriter.first_name} ${order.copywriter.last_name}`
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
              )}
              {showManager && (
                <TableCell className="text-sm">
                  {order.manager ? (
                    `${order.manager.first_name} ${order.manager.last_name}`
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              )}
              <TableCell className="text-sm text-muted-foreground">
                {new Date(order.created_at).toLocaleDateString('en-CA')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {orders.length === 0 && (
        <TableEmptyState
          title="No orders found."
          description="Orders show up here once a client checks out their cart. Try adjusting your filters above."
        />
      )}
    </>
  );
}
