'use client';

import { FilterBar, type FilterField } from '@/components/ui/filter-bar';

const STATUS_OPTIONS = [
  { value: 'ACCRUED', label: 'Accrued' },
  { value: 'PAYABLE', label: 'Payable' },
  { value: 'PAID', label: 'Paid' },
  { value: 'REVERSED', label: 'Reversed' },
];

export function CommissionFilters() {
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

  return <FilterBar fields={fields} filterKeys={['status']} />;
}
