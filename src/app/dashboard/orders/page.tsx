import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { requireUser } from '@/lib/features/auth';
import { OrderFilters } from '@/components/orders/order-filters';
import { OrdersTable } from '@/components/orders/orders-table';
import { OrdersKanban } from '@/components/orders/orders-kanban';
import { ViewToggle } from '@/components/orders/view-toggle';
import { KANBAN_COLUMNS } from '@/components/orders/kanban-columns';
import { toOrderRow } from '@/components/orders/order-row-mapper';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { parsePagination } from '@/lib/features/pagination';
import { fetchOrdersList } from '@/lib/data/orders';
import {
  fetchUsersByIds,
  fetchActiveByRole,
  fetchActiveClientsForManager,
} from '@/lib/data/users';
import type { Database } from '@/types/database.types';

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export const metadata = { title: 'Orders' };

type OrderStatus = Database['public']['Enums']['order_status'];

const KANBAN_PAGE_SIZE = 25;

export default async function OrdersPage({ searchParams }: PageProps) {
  const actor = await requireUser();
  if (!actor.role) notFound();

  const params = await searchParams;
  const statusFilter = params.status as OrderStatus | undefined;
  const copywriterFilter = params.copywriter;
  const clientFilter = params.client;
  const searchFilter = params.search?.trim() || undefined;
  // URL wins; fall back to the user's saved preference cookie; default to list.
  const cookieView = (await cookies()).get('orders_view')?.value;
  const view =
    params.view ??
    (cookieView === 'kanban' || cookieView === 'list' ? cookieView : 'list');
  const { page, pageSize } = parsePagination(params);

  const isManagerOrAdmin = actor.role === 'Manager' || actor.role === 'Admin';
  const isCopywriter = actor.role === 'Copywriter';
  const isClient = actor.role === 'Client';
  const isSourcer = actor.role === 'Sourcer';
  const canKanban = isClient || isManagerOrAdmin;
  const showKanban = canKanban && view === 'kanban';

  const checkedOut = params.checked_out ? Number(params.checked_out) : null;

  // Copywriters & clients lists for filters (manager/admin only)
  const [copywriters, clients] = isManagerOrAdmin
    ? await Promise.all([
        fetchActiveByRole('Copywriter'),
        actor.role === 'Admin'
          ? fetchActiveByRole('Client')
          : fetchActiveClientsForManager(actor.id),
      ])
    : [[], []];

  // For managers, restrict the client filter to their own clients to prevent
  // URL-tampered filtering across other managers' clients.
  const effectiveClientFilter =
    clientFilter &&
    isManagerOrAdmin &&
    clients.some((c) => c.id === clientFilter)
      ? clientFilter
      : undefined;

  if (showKanban) {
    // Fan out one query per column; skip the query for columns that don't
    // match the active status filter and synthesize an empty result instead.
    const columnResults = await Promise.all(
      KANBAN_COLUMNS.map((status) => {
        if (statusFilter && statusFilter !== status) {
          return Promise.resolve({ rows: [], total: 0 });
        }
        return fetchOrdersList({
          createdById: isClient ? actor.id : effectiveClientFilter,
          copywriterId:
            copywriterFilter && isManagerOrAdmin ? copywriterFilter : undefined,
          unassigned: params.assignee === 'unassigned' && isManagerOrAdmin,
          status,
          search: searchFilter,
          excludeDisabledCreators: true,
          page: 1,
          pageSize: KANBAN_PAGE_SIZE,
        });
      }),
    );

    const allUserIds = [
      ...new Set(
        columnResults.flatMap(({ rows }) =>
          rows.flatMap(
            (o) =>
              [o.copywriter_id, o.manager_id, o.created_by_id].filter(
                Boolean,
              ) as string[],
          ),
        ),
      ),
    ];
    const usersData = await fetchUsersByIds(allUserIds);
    const userMap = Object.fromEntries(usersData.map((u) => [u.id, u]));

    const initialColumns = Object.fromEntries(
      KANBAN_COLUMNS.map((status, i) => [
        status,
        {
          rows: columnResults[i].rows.map((o) => toOrderRow(o, userMap)),
          total: columnResults[i].total,
        },
      ]),
    ) as Parameters<typeof OrdersKanban>[0]['initialColumns'];

    return (
      <div className="flex h-full flex-col">
        <PageHeader
          title="Orders"
          description={isClient ? 'Your orders' : 'All orders'}
          actions={canKanban && <ViewToggle current="kanban" />}
        />

        {checkedOut !== null && (
          <div className="mb-4 rounded-lg border border-(--st-live-fg)/20 bg-(--st-live-bg) px-3 py-2 text-sm font-medium text-(--st-live-fg)">
            {checkedOut} order{checkedOut !== 1 ? 's' : ''} created
            successfully.
          </div>
        )}

        <div className="flex flex-1 flex-col gap-4 min-h-0">
          <OrderFilters
            copywriters={copywriters}
            clients={clients}
            showCopywriterFilter={isManagerOrAdmin}
            showClientFilter={isManagerOrAdmin}
            showStatusFilter={false}
          />

          <div className="flex-1 min-h-0">
            <OrdersKanban
              key={`${searchFilter ?? ''}|${copywriterFilter ?? ''}|${effectiveClientFilter ?? ''}|${params.assignee ?? ''}`}
              initialColumns={initialColumns}
              filters={{
                copywriterId: copywriterFilter,
                createdById: effectiveClientFilter,
                search: searchFilter,
                unassigned:
                  params.assignee === 'unassigned' && isManagerOrAdmin,
              }}
              pageSize={KANBAN_PAGE_SIZE}
            />
          </div>
        </div>
      </div>
    );
  }

  const { rows: rawList, total } = await fetchOrdersList({
    createdById: isClient ? actor.id : effectiveClientFilter,
    copywriterId: isCopywriter
      ? actor.id
      : copywriterFilter && isManagerOrAdmin
        ? copywriterFilter
        : undefined,
    sourcerId: isSourcer ? actor.id : undefined,
    unassigned: params.assignee === 'unassigned' && isManagerOrAdmin,
    status: statusFilter,
    search: searchFilter,
    excludeDisabledCreators: true,
    page,
    pageSize,
  });

  const allUserIds = [
    ...new Set(
      rawList.flatMap(
        (o) =>
          [o.copywriter_id, o.manager_id, o.created_by_id].filter(
            Boolean,
          ) as string[],
      ),
    ),
  ];
  const usersData = await fetchUsersByIds(allUserIds);
  const userMap = Object.fromEntries(usersData.map((u) => [u.id, u]));

  const orders = rawList.map((o) => toOrderRow(o, userMap));

  return (
    <div>
      <PageHeader
        title="Orders"
        description={
          isClient
            ? 'Your orders'
            : isCopywriter
              ? 'Your assigned orders'
              : 'All orders'
        }
        actions={canKanban && <ViewToggle current="list" />}
      />

      {checkedOut !== null && (
        <div className="mb-4 rounded-lg border border-(--st-live-fg)/20 bg-(--st-live-bg) px-3 py-2 text-sm font-medium text-(--st-live-fg)">
          {checkedOut} order{checkedOut !== 1 ? 's' : ''} created successfully.
        </div>
      )}

      <div className="space-y-4">
        <OrderFilters
          copywriters={copywriters}
          clients={clients}
          showCopywriterFilter={isManagerOrAdmin}
          showClientFilter={isManagerOrAdmin}
        />

        <OrdersTable
          orders={orders}
          showCopywriter={isManagerOrAdmin}
          showManager={actor.role === 'Admin'}
          showPrice={!isSourcer}
          showPayout={isSourcer}
        />
        <Pagination total={total} page={page} pageSize={pageSize} />
      </div>
    </div>
  );
}
