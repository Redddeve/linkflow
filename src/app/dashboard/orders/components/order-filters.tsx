'use client';

import { FilterBar } from '@/components/ui/filter-bar';
import type { FilterField } from '@/components/ui/filter-bar';

interface Copywriter {
  id: string;
  first_name: string;
  last_name: string;
}

interface Props {
  copywriters?: Copywriter[];
  showCopywriterFilter?: boolean;
  showStatusFilter?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'New', label: 'New' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Content Sent', label: 'Content Sent' },
  { value: 'Needs changes', label: 'Needs changes' },
  { value: 'Content Approved', label: 'Content Approved' },
  { value: 'Published', label: 'Published' },
  { value: 'Canceled', label: 'Canceled' },
];

export function OrderFilters({
  copywriters = [],
  showCopywriterFilter = false,
  showStatusFilter = true,
}: Props) {
  const fields: FilterField[] = [];

  if (showStatusFilter) {
    fields.push({
      type: 'select',
      key: 'status',
      placeholder: 'All statuses',
      allLabel: 'All statuses',
      options: STATUS_OPTIONS,
      className: 'w-44 h-9',
    });
  }

  if (showCopywriterFilter && copywriters.length > 0) {
    fields.push({
      type: 'select',
      key: 'copywriter',
      placeholder: 'All copywriters',
      allLabel: 'All copywriters',
      options: copywriters.map((c) => ({
        value: c.id,
        label: `${c.first_name} ${c.last_name}`,
      })),
      className: 'w-48 h-9',
    });
  }

  const filterKeys = [
    'search',
    ...(showStatusFilter ? ['status'] : []),
    ...(showCopywriterFilter ? ['copywriter'] : []),
  ];

  return (
    <FilterBar
      searchKey="search"
      searchPlaceholder="Search domain…"
      fields={fields}
      filterKeys={filterKeys}
    />
  );
}
