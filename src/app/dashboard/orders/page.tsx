import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { OrderFilters } from './components/order-filters';
import { OrdersTable } from './components/orders-table';
import { OrdersKanban } from './components/orders-kanban';
import { PageHeader } from '@/components/ui/page-header';
import type { Database } from '@/types/database.types';

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export const metadata = { title: 'Orders' };

type OrderStatus = Database['public']['Enums']['order_status'];

export default async function OrdersPage({ searchParams }: PageProps) {
  const actor = await requireUser();
  if (!actor.role) notFound();

  const params = await searchParams;
  const statusFilter = params.status as OrderStatus | undefined;
  const copywriterFilter = params.copywriter;
  const searchFilter = params.search?.toLowerCase();
  const view = params.view ?? 'list';

  const supabase = await createClient();

  const isManagerOrAdmin = actor.role === 'Manager' || actor.role === 'Admin';
  const isCopywriter = actor.role === 'Copywriter';
  const isClient = actor.role === 'Client';

  let query = supabase
    .from('orders')
    .select('id, site_domain, status, price_cents, publish_date, created_at, copywriter_id, manager_id')
    .order('created_at', { ascending: false });

  if (isClient) {
    query = query.eq('created_by_id', actor.id);
  } else if (isCopywriter) {
    query = query.eq('copywriter_id', actor.id);
  }

  if (statusFilter) query = query.eq('status', statusFilter);
  if (copywriterFilter && isManagerOrAdmin) query = query.eq('copywriter_id', copywriterFilter);
  if (params.assignee === 'unassigned' && isManagerOrAdmin) query = query.is('copywriter_id', null);

  const { data: ordersRaw } = await query;
  const rawList = ordersRaw ?? [];

  // Resolve user names separately to avoid multi-FK Supabase type error
  const allUserIds = [
    ...new Set(rawList.flatMap((o) => [o.copywriter_id, o.manager_id].filter(Boolean) as string[])),
  ];
  const { data: usersData } = allUserIds.length
    ? await supabase.from('users').select('id, first_name, last_name').in('id', allUserIds)
    : { data: [] };
  const userMap = Object.fromEntries((usersData ?? []).map((u) => [u.id, u]));

  let orders = rawList.map((o) => ({
    id: o.id,
    site_domain: o.site_domain,
    status: o.status,
    price_cents: o.price_cents,
    publish_date: o.publish_date,
    created_at: o.created_at,
    copywriter: o.copywriter_id ? (userMap[o.copywriter_id] ?? null) : null,
    manager: o.manager_id ? (userMap[o.manager_id] ?? null) : null,
  }));

  if (searchFilter) {
    orders = orders.filter((o) => o.site_domain.toLowerCase().includes(searchFilter));
  }

  // Copywriters list for filter (manager/admin only)
  let copywriters: { id: string; first_name: string; last_name: string }[] = [];
  if (isManagerOrAdmin) {
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('role', 'Copywriter')
      .eq('status', 'ACTIVE')
      .order('first_name');
    copywriters = data ?? [];
  }

  const showKanban = isManagerOrAdmin && view === 'kanban';
  const checkedOut = params.checked_out ? Number(params.checked_out) : null;

  return (
    <div>
      <PageHeader
        title="Orders"
        description={isClient ? 'Your orders' : isCopywriter ? 'Your assigned orders' : 'All orders'}
        actions={
          isManagerOrAdmin && (
            <div className="inline-flex rounded-lg border border-border bg-card p-0.5 shadow-xs">
              <Link
                href="?view=list"
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  view !== 'kanban'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                List
              </Link>
              <Link
                href="?view=kanban"
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  view === 'kanban'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Kanban
              </Link>
            </div>
          )
        }
      />

      {checkedOut !== null && (
        <div className="mb-4 rounded-lg border border-(--st-live-fg)/20 bg-(--st-live-bg) px-3 py-2 text-sm font-medium text-(--st-live-fg)">
          {checkedOut} order{checkedOut !== 1 ? 's' : ''} created successfully.
        </div>
      )}

      <div className="space-y-4">
        <OrderFilters
          copywriters={copywriters}
          showCopywriterFilter={isManagerOrAdmin}
        />

        {showKanban ? (
          <OrdersKanban orders={orders} />
        ) : (
          <OrdersTable
            orders={orders}
            showCopywriter={isManagerOrAdmin}
            showManager={actor.role === 'Admin'}
          />
        )}
      </div>
    </div>
  );
}
