'use client';

import { FilterBar } from '@/components/ui/filter-bar';
import type { FilterField } from '@/components/ui/filter-bar';

const fields: FilterField[] = [
  {
    type: 'select',
    key: 'role',
    placeholder: 'All roles',
    allLabel: 'All roles',
    options: [
      { value: 'Client', label: 'Client' },
      { value: 'Sourcer', label: 'Sourcer' },
      { value: 'Copywriter', label: 'Copywriter' },
      { value: 'Manager', label: 'Manager' },
      { value: 'Admin', label: 'Admin' },
    ],
    className: 'w-40 h-9',
  },
  {
    type: 'select',
    key: 'status',
    placeholder: 'All statuses',
    allLabel: 'All statuses',
    options: [
      { value: 'PENDING', label: 'Pending' },
      { value: 'ACTIVE', label: 'Active' },
      { value: 'DISABLED', label: 'Disabled' },
    ],
    className: 'w-40 h-9',
  },
];

export function UserFilters() {
  return (
    <FilterBar
      searchKey="q"
      searchPlaceholder="Search by name or email…"
      fields={fields}
      filterKeys={['q', 'role', 'status']}
    />
  );
}
