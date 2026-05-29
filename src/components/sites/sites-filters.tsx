'use client';

import { FilterBar } from '@/components/ui/filter-bar';
import type { FilterField } from '@/components/ui/filter-bar';

interface Category {
  id: string;
  name: string;
}

interface Props {
  categories: Category[];
}

export function SitesFilters({ categories }: Props) {
  const fields: FilterField[] = [
    {
      type: 'select',
      key: 'status',
      placeholder: 'All statuses',
      allLabel: 'All statuses',
      options: [
        { value: 'Pending', label: 'Pending' },
        { value: 'Active', label: 'Active' },
        { value: 'Archived', label: 'Archived' },
      ],
      className: 'w-44 h-9',
    },
    {
      type: 'select',
      key: 'category',
      placeholder: 'All categories',
      allLabel: 'All categories',
      options: categories.map((c) => ({ value: c.id, label: c.name })),
      className: 'w-44 h-9',
    },
    { type: 'number', key: 'price_min', placeholder: 'Min $ price', min: 0, className: 'w-32 h-9' },
    { type: 'number', key: 'price_max', placeholder: 'Max $ price', min: 0, className: 'w-32 h-9' },
  ];

  return (
    <FilterBar
      searchKey="search"
      searchPlaceholder="Search by domain…"
      fields={fields}
      filterKeys={['search', 'status', 'category', 'price_min', 'price_max']}
    />
  );
}
