import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { InvoiceFilters } from './components/invoice-filters';
import { InvoicesTable } from './components/invoices-table';
import { GenerateInvoicesDialog } from './components/generate-invoices-dialog';
import { PageHeader } from '@/components/ui/page-header';
import type { Database } from '@/types/database.types';

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export const metadata = { title: 'Invoices' };

type InvoiceStatus = Database['public']['Enums']['invoice_status'];
const INVOICE_STATUSES: readonly InvoiceStatus[] = ['Draft', 'Sent', 'Paid'];

function isInvoiceStatus(value: string | undefined): value is InvoiceStatus {
  return typeof value === 'string' && (INVOICE_STATUSES as readonly string[]).includes(value);
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const actor = await requireUser();
  if (!actor.role) notFound();

  const params = await searchParams;
  const statusFilter = isInvoiceStatus(params.status) ? params.status : undefined;
  const clientFilter = params.client;
  const searchFilter = params.search?.toLowerCase();

  const supabase = await createClient();

  const isManagerOrAdmin = actor.role === 'Manager' || actor.role === 'Admin';
  const isClient = actor.role === 'Client';

  if (!isManagerOrAdmin && !isClient) notFound();

  let query = supabase
    .from('invoices')
    .select('id, client_id, billing_month, status, total_price_cents, created_at')
    .order('billing_month', { ascending: false })
    .order('created_at', { ascending: false });

  if (isClient) {
    query = query.eq('client_id', actor.id);
  }
  if (statusFilter) query = query.eq('status', statusFilter);
  if (clientFilter && isManagerOrAdmin) query = query.eq('client_id', clientFilter);

  const { data: invoicesRaw } = await query;
  const rawList = invoicesRaw ?? [];

  // Resolve client names separately (avoid multi-FK Supabase join typing issue)
  const clientIds = [...new Set(rawList.map((i) => i.client_id))];
  const { data: clientsData } = clientIds.length
    ? await supabase.from('users').select('id, first_name, last_name').in('id', clientIds)
    : { data: [] };
  const clientMap = Object.fromEntries((clientsData ?? []).map((u) => [u.id, u]));

  let invoices = rawList.map((i) => ({
    id: i.id,
    client_id: i.client_id,
    billing_month: i.billing_month,
    status: i.status,
    total_price_cents: i.total_price_cents,
    created_at: i.created_at,
    client: clientMap[i.client_id] ?? null,
  }));

  if (searchFilter && isManagerOrAdmin) {
    invoices = invoices.filter((i) => {
      const name = i.client ? `${i.client.first_name} ${i.client.last_name}` : '';
      return name.toLowerCase().includes(searchFilter);
    });
  }

  // Clients list for filter (manager/admin only)
  let clients: { id: string; first_name: string; last_name: string }[] = [];
  if (isManagerOrAdmin) {
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('role', 'Client')
      .eq('status', 'ACTIVE')
      .order('first_name');
    clients = data ?? [];
  }

  return (
    <div>
      <PageHeader
        title="Invoices"
        description={isClient ? 'Your invoices' : 'All client invoices'}
        actions={actor.role === 'Admin' ? <GenerateInvoicesDialog /> : undefined}
      />
      <div className="space-y-4">
        <InvoiceFilters clients={clients} showClientFilter={isManagerOrAdmin} />
        <InvoicesTable invoices={invoices} showClient={isManagerOrAdmin} />
      </div>
    </div>
  );
}
