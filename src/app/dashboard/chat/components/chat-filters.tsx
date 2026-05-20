'use client';

import { FilterBar } from '@/components/ui/filter-bar';
import type { ChatParticipant } from '@/lib/data/chat';

interface Props {
  users: ChatParticipant[];
}

export function ChatFilters({ users }: Props) {
  return (
    <FilterBar
      fields={[
        {
          type: 'select',
          key: 'user',
          placeholder: 'Participant',
          allLabel: 'All participants',
          options: users.map((u) => ({
            value: u.id,
            label: `${u.first_name} ${u.last_name}`,
          })),
        },
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
      ]}
      filterKeys={['user', 'status']}
    />
  );
}
