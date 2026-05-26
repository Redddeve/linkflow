import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { InvoiceFilters } from '@/components/invoices/components/invoice-filters';
import { InvoicesTable } from '@/components/invoices/components/invoices-table';
import { GenerateInvoicesDialog } from '@/components/invoices/components/generate-invoices-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { parsePagination } from '@/lib/pagination';
import { fetchInvoicesList } from '@/lib/data/invoices';
import { fetchUsersByIds, fetchActiveByRole } from '@/lib/data/users';
import type { Database } from '@/types/database.types';

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export const metadata = { title: 'Invoices' };

type InvoiceStatus = Database['public']['Enums']['invoice_status'];
const INVOICE_STATUSES: readonly InvoiceStatus[] = ['Draft', 'Sent', 'Paid'];

function isInvoiceStatus(value: string | undefined): value is InvoiceStatus {
  return (
    typeof value === 'string' &&
    (INVOICE_STATUSES as readonly string[]).includes(value)
  );
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const actor = await requireUser();
  if (!actor.role) notFound();

  const params = await searchParams;
  const statusFilter = isInvoiceStatus(params.status)
    ? params.status
    : undefined;
  const clientFilter = params.client;
  const searchFilter = params.search?.trim() || undefined;
  const { page, pageSize } = parsePagination(params);

  const isManagerOrAdmin = actor.role === 'Manager' || actor.role === 'Admin';
  const isClient = actor.role === 'Client';

  if (!isManagerOrAdmin && !isClient) notFound();

  const { rows: rawList, total } = await fetchInvoicesList({
    clientId: isClient
      ? actor.id
      : clientFilter && isManagerOrAdmin
        ? clientFilter
        : undefined,
    status: statusFilter,
    search: isManagerOrAdmin ? searchFilter : undefined,
    excludeDisabledClients: true,
    page,
    pageSize,
  });

  const clientIds = [...new Set(rawList.map((i) => i.client_id))];
  const clientsData = await fetchUsersByIds(clientIds);
  const clientMap = Object.fromEntries(clientsData.map((u) => [u.id, u]));

  const invoices = rawList.map((i) => ({
    id: i.id,
    client_id: i.client_id,
    billing_month: i.billing_month,
    status: i.status,
    total_price_cents: i.total_price_cents,
    created_at: i.created_at,
    client: clientMap[i.client_id] ?? null,
  }));

  // Clients list for filter (manager/admin only)
  const clients = isManagerOrAdmin ? await fetchActiveByRole('Client') : [];

  return (
    <div>
      <PageHeader
        title="Invoices"
        description={isClient ? 'Your invoices' : 'All client invoices'}
        actions={
          actor.role === 'Admin' ? <GenerateInvoicesDialog /> : undefined
        }
      />
      <div className="space-y-4">
        <InvoiceFilters clients={clients} showClientFilter={isManagerOrAdmin} />
        <InvoicesTable invoices={invoices} showClient={isManagerOrAdmin} />
        <Pagination total={total} page={page} pageSize={pageSize} />
      </div>
    </div>
  );
}
