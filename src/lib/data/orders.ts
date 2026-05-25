import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

type OrderStatus = Database['public']['Enums']['order_status'];

export interface OrdersListFilters {
  createdById?: string;
  copywriterId?: string | null;
  sourcerId?: string;
  unassigned?: boolean;
  status?: OrderStatus;
  /** Substring match against site_domain (case-insensitive). */
  search?: string;
  /** When true, exclude orders whose creator is DISABLED. */
  excludeDisabledCreators?: boolean;
  page?: number;
  pageSize?: number;
}

export type OrdersListRow = {
  id: string;
  site_domain: string;
  status: OrderStatus;
  price_cents: number;
  publish_date: string | null;
  published_at: string | null;
  created_at: string;
  created_by_id: string;
  copywriter_id: string | null;
  manager_id: string | null;
  sourcer_payout_cents: number | null;
  sourcer_paid_at: string | null;
};

export async function fetchOrdersList(
  filters: OrdersListFilters,
): Promise<{ rows: OrdersListRow[]; total: number }> {
  const supabase = await createClient();
  const baseSelect =
    'id, site_domain, status, price_cents, publish_date, published_at, created_at, created_by_id, copywriter_id, manager_id, sourcer_payout_cents, sourcer_paid_at';
  const joins: string[] = [];
  if (filters.sourcerId) joins.push('sites!inner(sourcer_id)');
  if (filters.excludeDisabledCreators) joins.push('creator:users!orders_created_by_id_fkey!inner(status)');
  const select = joins.length ? `${baseSelect}, ${joins.join(', ')}` : baseSelect;

  let query = supabase
    .from('orders')
    .select(select, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters.createdById) query = query.eq('created_by_id', filters.createdById);
  if (filters.copywriterId) query = query.eq('copywriter_id', filters.copywriterId);
  if (filters.unassigned) query = query.is('copywriter_id', null);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.sourcerId) query = query.eq('sites.sourcer_id', filters.sourcerId);
  if (filters.excludeDisabledCreators) query = query.neq('creator.status', 'DISABLED');
  if (filters.search) {
    const escaped = filters.search.replace(/[\\%_]/g, (m) => `\\${m}`);
    query = query.ilike('site_domain', `%${escaped}%`);
  }

  if (filters.page && filters.pageSize) {
    const offset = (filters.page - 1) * filters.pageSize;
    query = query.range(offset, offset + filters.pageSize - 1);
  }

  const { data, count } = await query;
  return {
    rows: (data ?? []) as unknown as OrdersListRow[],
    total: count ?? 0,
  };
}

export async function fetchOrderById(id: string) {
  const supabase = await createClient();
  return supabase.from('orders').select('*').eq('id', id).single();
}

export async function fetchOrderForEdit(id: string) {
  const supabase = await createClient();
  return supabase
    .from('orders')
    .select(
      'id, site_domain, status, copywriter_id, content_body, site_requirements, site_description, publish_date',
    )
    .eq('id', id)
    .single();
}

export async function fetchOrderForPublish(id: string) {
  const supabase = await createClient();
  return supabase
    .from('orders')
    .select('id, site_domain, status, publish_date')
    .eq('id', id)
    .single();
}

export async function fetchOrderComments(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('comments')
    .select('id, text, created_at, created_by_id')
    .eq('order_id', orderId)
    .order('created_at');
  return data ?? [];
}

export async function fetchClientActiveOrders(
  clientId: string,
): Promise<{ status: OrderStatus }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select('status')
    .eq('created_by_id', clientId)
    .not('status', 'in', '("Completed","Canceled")');
  return data ?? [];
}

export async function countCopywriterOrders(
  copywriterId: string,
  statuses: OrderStatus[],
): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('copywriter_id', copywriterId)
    .in('status', statuses);
  return count ?? 0;
}

export async function countCopywriterOrdersByStatus(
  copywriterId: string,
  status: OrderStatus,
): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('copywriter_id', copywriterId)
    .eq('status', status);
  return count ?? 0;
}

export async function fetchCopywriterUpcoming(
  copywriterId: string,
  statuses: OrderStatus[],
  limit = 5,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select('id, site_domain, status, publish_date')
    .eq('copywriter_id', copywriterId)
    .in('status', statuses)
    .order('publish_date', { ascending: true, nullsFirst: false })
    .limit(limit);
  return data ?? [];
}

export async function countUnassignedOrders(statuses: OrderStatus[]): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .is('copywriter_id', null)
    .in('status', statuses);
  return count ?? 0;
}

export async function countOrdersByStatus(status: OrderStatus): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', status);
  return count ?? 0;
}

export async function fetchManagerRecentActive(statuses: OrderStatus[], limit = 5) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select('id, site_domain, status, copywriter_id, publish_date')
    .in('status', statuses)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}
