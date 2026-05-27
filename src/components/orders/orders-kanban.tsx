'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { CalendarDays, User2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { OrderStatusBadge } from './order-status-badge';
import { KANBAN_COLUMNS, type KanbanColumnStatus } from './kanban-columns';
import { fetchOrdersColumn } from '@/app/dashboard/orders/actions';
import type { OrderRow } from './orders-table';
import type { Database } from '@/types/database.types';

type OrderStatus = Database['public']['Enums']['order_status'];
type ViewerRole = Database['public']['Enums']['user_role'];

const COLUMN_TINTS: Record<KanbanColumnStatus, string> = {
  New: 'var(--card)',
  'In Progress': 'var(--kc-in-progress)',
  'Content Sent': 'var(--kc-content-sent)',
  'Needs changes': 'var(--kc-needs-changes)',
  'Content Approved': 'var(--kc-content-approved)',
  Published: 'var(--kc-published)',
  Canceled: 'var(--kc-canceled)',
};

const COLUMN_TEXT: Record<KanbanColumnStatus, string> = {
  New: 'var(--foreground)',
  'In Progress': 'var(--primary-text)',
  'Content Sent': '#b45309',
  'Needs changes': 'var(--st-assign-fg)',
  'Content Approved': 'var(--st-pub-fg)',
  Published: '#166534',
  Canceled: 'var(--destructive)',
};

const BADGE_BG: Record<KanbanColumnStatus, string> = {
  New: 'var(--surface-2)',
  'In Progress': '#d5dcf5',
  'Content Sent': 'var(--kb-content-sent)',
  'Needs changes': 'var(--kb-needs-changes)',
  'Content Approved': 'var(--kb-content-approved)',
  Published: 'var(--kb-published)',
  Canceled: 'var(--kb-canceled)',
};

export interface OrdersKanbanProps {
  initialColumns: Record<
    KanbanColumnStatus,
    { rows: OrderRow[]; total: number }
  >;
  filters: {
    copywriterId?: string;
    createdById?: string;
    search?: string;
    unassigned?: boolean;
    status?: OrderStatus;
  };
  pageSize?: number;
  viewerRole?: ViewerRole;
}

function initials(user: { first_name: string; last_name: string }) {
  return `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase();
}

function fullName(user: { first_name: string; last_name: string }) {
  return `${user.first_name} ${user.last_name}`.trim();
}

interface ColumnState {
  rows: OrderRow[];
  total: number;
  page: number;
  loading: boolean;
}

export function OrdersKanban({
  initialColumns,
  filters,
  pageSize = 25,
  viewerRole,
}: OrdersKanbanProps) {
  const showClient = viewerRole !== 'Client';
  const [columns, setColumns] = useState<
    Record<KanbanColumnStatus, ColumnState>
  >(
    () =>
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
            createdById: filters.createdById,
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
        setColumns((s) => ({
          ...s,
          [status]: { ...s[status], loading: false },
        }));
      }
    });
  }

  return (
    <div className="flex gap-4 overflow-auto pb-2 -mx-2 px-2 h-full">
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
            className="flex shrink-0 w-72 flex-col gap-3 rounded-md p-3"
            style={{ backgroundColor: COLUMN_TINTS[status] }}
          >
            <div className="flex items-center justify-between gap-2">
              <OrderStatusBadge
                status={status}
                className="h-auto rounded-md border-transparent px-3 py-1 text-md font-semibold"
                style={{ backgroundColor: BADGE_BG[status] }}
              />
              <span
                data-testid="kanban-column-total"
                className="text-md font-medium"
                style={{ color: COLUMN_TEXT[status] }}
              >
                {isFilteredOut ? 0 : col.total}
              </span>
            </div>
            <div
              data-testid={`kanban-column-${status}`}
              className="flex flex-col gap-2 flex-1"
            >
              {isFilteredOut ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Filtered out
                </p>
              ) : col.rows.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Empty
                </p>
              ) : (
                col.rows.map((order) => (
                  <Link
                    key={order.id}
                    href={`/dashboard/orders/${order.id}`}
                    data-testid="kanban-card"
                    className="group/card rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Card className="gap-0 py-0 rounded-md shadow-sm transition-all group-hover/card:border-ring group-hover/card:shadow-md cursor-pointer">
                      <CardHeader className="px-3 pt-3 pb-2 gap-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className="text-sm font-semibold leading-tight truncate"
                            title={order.site_domain}
                          >
                            {order.site_domain}
                          </p>
                          <span className="text-sm font-semibold tabular-nums text-foreground shrink-0">
                            ${(order.price_cents / 100).toFixed(2)}
                          </span>
                        </div>
                        {showClient && order.client && (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Avatar size="sm" className="size-5">
                              <AvatarFallback className="text-[9px]">
                                {initials(order.client)}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className="text-xs text-muted-foreground truncate"
                              title={fullName(order.client)}
                            >
                              {fullName(order.client)}
                            </span>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="px-3 pb-3 pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                        {order.publish_date ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums"
                            title="Publish date"
                          >
                            <CalendarDays className="size-3.5" aria-hidden />
                            {order.publish_date}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No date
                          </span>
                        )}
                        {order.copywriter ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[55%]"
                            title={`Copywriter: ${fullName(order.copywriter)}`}
                          >
                            <User2 className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate">
                              {fullName(order.copywriter)}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/70">
                            <User2 className="size-3.5" aria-hidden />
                            Unassigned
                          </span>
                        )}
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
                  {col.loading
                    ? 'Loading…'
                    : `Load more (${remaining} remaining)`}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
