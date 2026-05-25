'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from './order-status-badge';
import { KANBAN_COLUMNS, type KanbanColumnStatus } from './kanban-columns';
import { fetchOrdersColumn } from '../actions';
import type { OrderRow } from './orders-table';
import type { Database } from '@/types/database.types';

type OrderStatus = Database['public']['Enums']['order_status'];

export interface OrdersKanbanProps {
  initialColumns: Record<KanbanColumnStatus, { rows: OrderRow[]; total: number }>;
  filters: {
    copywriterId?: string;
    search?: string;
    unassigned?: boolean;
    status?: OrderStatus;
  };
  pageSize?: number;
}

interface ColumnState {
  rows: OrderRow[];
  total: number;
  page: number;
  loading: boolean;
}

export function OrdersKanban({ initialColumns, filters, pageSize = 25 }: OrdersKanbanProps) {
  const [columns, setColumns] = useState<Record<KanbanColumnStatus, ColumnState>>(() =>
    Object.fromEntries(
      KANBAN_COLUMNS.map((s) => [
        s,
        {
          rows: initialColumns[s]?.rows ?? [],
          total: initialColumns[s]?.total ?? 0,
          page: 1,
          loading: false,
        },
      ]),
    ) as Record<KanbanColumnStatus, ColumnState>,
  );
  const [, startTransition] = useTransition();

  function loadMore(status: KanbanColumnStatus) {
    const current = columns[status];
    if (current.loading) return;

    setColumns((s) => ({ ...s, [status]: { ...s[status], loading: true } }));

    startTransition(async () => {
      try {
        const next = await fetchOrdersColumn({
          status,
          page: current.page + 1,
          pageSize,
          filters: {
            copywriterId: filters.copywriterId,
            search: filters.search,
            unassigned: filters.unassigned,
          },
        });
        setColumns((s) => ({
          ...s,
          [status]: {
            rows: [...s[status].rows, ...next.rows],
            total: next.total,
            page: s[status].page + 1,
            loading: false,
          },
        }));
      } catch {
        setColumns((s) => ({ ...s, [status]: { ...s[status], loading: false } }));
      }
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 min-w-0">
      {KANBAN_COLUMNS.map((status) => {
        const col = columns[status];
        const isFilteredOut = !!filters.status && filters.status !== status;
        const remaining = col.total - col.rows.length;
        const showLoadMore = !isFilteredOut && remaining > 0;

        return (
          <div
            key={status}
            data-testid="kanban-column"
            data-status={status}
            className="flex shrink-0 w-72 flex-col gap-2"
          >
            <div className="flex items-center gap-2 px-1">
              <OrderStatusBadge status={status} />
              <span
                data-testid="kanban-column-total"
                className="text-xs text-muted-foreground ml-auto"
              >
                {isFilteredOut ? 0 : col.total}
              </span>
            </div>
            <div
              data-testid={`kanban-column-${status}`}
              className="flex flex-col gap-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-1"
            >
              {isFilteredOut ? (
                <p className="text-xs text-muted-foreground text-center py-6">Filtered out</p>
              ) : col.rows.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Empty</p>
              ) : (
                col.rows.map((order) => (
                  <Link
                    key={order.id}
                    href={`/dashboard/orders/${order.id}`}
                    data-testid="kanban-card"
                  >
                    <Card className="hover:border-ring transition-colors cursor-pointer">
                      <CardHeader className="pb-1 pt-3 px-3">
                        <p className="text-sm font-medium truncate">{order.site_domain}</p>
                      </CardHeader>
                      <CardContent className="px-3 pb-3 space-y-1">
                        {order.publish_date && (
                          <p className="text-xs text-muted-foreground">
                            Publish: {order.publish_date}
                          </p>
                        )}
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
                ))
              )}
              {showLoadMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadMore(status)}
                  disabled={col.loading}
                  className="mt-1"
                >
                  {col.loading ? 'Loading…' : `Load more (${remaining} remaining)`}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
