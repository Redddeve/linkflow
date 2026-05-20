'use client';

import { FilterBar } from '@/components/ui/filter-bar';
import type { FilterField } from '@/components/ui/filter-bar';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface Props {
  clients?: Client[];
  showClientFilter?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Sent', label: 'Sent' },
  { value: 'Paid', label: 'Paid' },
];

export function InvoiceFilters({ clients = [], showClientFilter = false }: Props) {
  const fields: FilterField[] = [
    {
      type: 'select',
      key: 'status',
      placeholder: 'All statuses',
      allLabel: 'All statuses',
      options: STATUS_OPTIONS,
      className: 'w-40 h-9',
    },
  ];

  if (showClientFilter && clients.length > 0) {
    fields.push({
      type: 'select',
      key: 'client',
      placeholder: 'All clients',
      allLabel: 'All clients',
      options: clients.map((c) => ({
        value: c.id,
        label: `${c.first_name} ${c.last_name}`,
      })),
      className: 'w-48 h-9',
    });
  }

  const filterKeys = ['search', 'status', ...(showClientFilter ? ['client'] : [])];

  return (
    <FilterBar
      searchKey="search"
      searchPlaceholder="Search client…"
      fields={fields}
      filterKeys={filterKeys}
    />
  );
}
