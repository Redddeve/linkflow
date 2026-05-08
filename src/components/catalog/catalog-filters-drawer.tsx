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

export function CatalogFiltersDrawer({ categories }: Props) {
  const fields: FilterField[] = [
    {
      type: 'select',
      key: 'category',
      placeholder: 'All categories',
      allLabel: 'All categories',
      options: categories.map((c) => ({ value: c.id, label: c.name })),
      className: 'w-48 h-9',
    },
    {
      type: 'select',
      key: 'link_type',
      placeholder: 'All types',
      allLabel: 'All types',
      options: [
        { value: 'dofollow', label: 'Dofollow' },
        { value: 'nofollow', label: 'Nofollow' },
        { value: 'sponsored', label: 'Sponsored' },
        { value: 'ugc', label: 'UGC' },
      ],
      className: 'w-40 h-9',
    },
    { type: 'number', key: 'dr_min', placeholder: 'DR min', min: 0, max: 100, className: 'w-28 h-9' },
    { type: 'number', key: 'dr_max', placeholder: 'DR max', min: 0, max: 100, className: 'w-28 h-9' },
    { type: 'number', key: 'price_min', placeholder: 'Price min', min: 0, className: 'w-28 h-9' },
    { type: 'number', key: 'price_max', placeholder: 'Price max', min: 0, className: 'w-28 h-9' },
  ];

  return (
    <FilterBar
      searchKey="search"
      searchPlaceholder="Search domain…"
      fields={fields}
      filterKeys={['search', 'category', 'link_type', 'dr_min', 'dr_max', 'price_min', 'price_max']}
    />
  );
}
