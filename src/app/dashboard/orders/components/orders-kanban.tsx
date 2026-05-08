import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrderStatusBadge } from './order-status-badge';
import type { OrderRow } from './orders-table';
import type { Database } from '@/types/database.types';

type OrderStatus = Database['public']['Enums']['order_status'];

const KANBAN_COLUMNS: OrderStatus[] = ['New', 'In Progress', 'Needs changes', 'Content Sent'];

interface Props {
  orders: OrderRow[];
}

export function OrdersKanban({ orders }: Props) {
  const byStatus = KANBAN_COLUMNS.reduce<Record<string, OrderRow[]>>((acc, status) => {
    acc[status] = orders.filter((o) => o.status === status);
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-4 gap-4 min-w-0">
      {KANBAN_COLUMNS.map((status) => (
        <div key={status} className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-1">
            <OrderStatusBadge status={status} />
            <span className="text-xs text-muted-foreground ml-auto">
              {byStatus[status].length}
            </span>
          </div>
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="flex flex-col gap-2 pr-3">
              {byStatus[status].length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Empty</p>
              )}
              {byStatus[status].map((order) => (
                <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                  <Card className="hover:border-ring transition-colors cursor-pointer">
                    <CardHeader className="pb-1 pt-3 px-3">
                      <p className="text-sm font-medium truncate">{order.site_domain}</p>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Publish: {order.publish_date}
                      </p>
                      {order.copywriter && (
                        <p className="text-xs text-muted-foreground truncate">
                          {order.copywriter.first_name} {order.copywriter.last_name}
                        </p>
                      )}
                      <p className="text-xs font-medium">
                        ${(order.price_cents / 100).toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
