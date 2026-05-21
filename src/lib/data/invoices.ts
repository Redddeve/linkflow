import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

type InvoiceStatus = Database['public']['Enums']['invoice_status'];

export interface InvoicesListFilters {
  clientId?: string;
  status?: InvoiceStatus;
}

export type InvoicesListRow = {
  id: string;
  client_id: string;
  billing_month: string;
  status: InvoiceStatus;
  total_price_cents: number;
  created_at: string;
};

export async function fetchInvoicesList(
  filters: InvoicesListFilters,
): Promise<InvoicesListRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from('invoices')
    .select('id, client_id, billing_month, status, total_price_cents, created_at')
    .order('billing_month', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters.clientId) query = query.eq('client_id', filters.clientId);
  if (filters.status) query = query.eq('status', filters.status);

  const { data } = await query;
  return data ?? [];
}

export async function fetchInvoiceById(id: string) {
  const supabase = await createClient();
  return supabase.from('invoices').select('*').eq('id', id).single();
}

export async function fetchUnattachedOrdersForInvoice(
  clientId: string,
  billingMonth: string,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select('id, site_domain, publish_date, price_cents')
    .eq('created_by_id', clientId)
    .eq('billing_month', billingMonth)
    .eq('status', 'Published')
    .is('invoice_id', null)
    .order('publish_date', { ascending: true });
  return data ?? [];
}

export async function fetchInvoiceOrders(invoiceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select(
      'id, site_domain, publish_date, price_cents, billing_month, status, published_url',
    )
    .eq('invoice_id', invoiceId)
    .order('publish_date', { ascending: true });
  return data ?? [];
}

export async function fetchLatestInvoiceForClient(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('invoices')
    .select('id, billing_month, total_price_cents, status')
    .eq('client_id', clientId)
    .order('billing_month', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function sumClientInvoicesByStatus(
  clientId: string,
  status: InvoiceStatus,
): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('invoices')
    .select('total_price_cents')
    .eq('client_id', clientId)
    .eq('status', status);
  return (data ?? []).reduce((sum, i) => sum + (i.total_price_cents ?? 0), 0);
}

export async function countInvoicesByStatus(status: InvoiceStatus): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('status', status);
  return count ?? 0;
}
