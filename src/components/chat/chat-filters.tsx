'use client';

import { FilterBar } from '@/components/ui/filter-bar';

export function ChatFilters() {
  return (
    <FilterBar
      searchKey="q"
      searchPlaceholder="Search chats or participants…"
      fields={[
        {
          type: 'select',
          key: 'status',
          placeholder: 'Status',
          allLabel: 'All statuses',
          options: [
            { value: 'Active', label: 'Active' },
            { value: 'Archived', label: 'Archived' },
          ],
        },
        {
          type: 'select',
          key: 'category',
          placeholder: 'Category',
          allLabel: 'All categories',
          options: [
            { value: 'Standard', label: 'Standard' },
            { value: 'Support', label: 'Support' },
            { value: 'Sales', label: 'Sales' },
          ],
        },
      ]}
      filterKeys={['q', 'status', 'category']}
    />
  );
}
