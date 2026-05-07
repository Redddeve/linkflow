'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function UserFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page');
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  function handleSearch(val: string) {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => update('q', val), 300);
  }

  return (
    <div role="search" className="flex flex-wrap gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="user-search" className="sr-only">
          Search users
        </label>
        <Input
          id="user-search"
          type="search"
          placeholder="Search by name or email…"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-64"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="role-filter" className="sr-only">
          Filter by role
        </label>
        <Select
          value={searchParams.get('role') ?? 'All'}
          onValueChange={(v) => update('role', !v || v === 'All' ? '' : v)}
        >
          <SelectTrigger id="role-filter" className="w-40 h-9">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All roles</SelectItem>
            <SelectItem value="Client">Client</SelectItem>
            <SelectItem value="Sourcer">Sourcer</SelectItem>
            <SelectItem value="Copywriter">Copywriter</SelectItem>
            <SelectItem value="Manager">Manager</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="status-filter" className="sr-only">
          Filter by status
        </label>
        <Select
          value={searchParams.get('status') ?? 'All'}
          onValueChange={(v) => update('status', !v || v === 'All' ? '' : v)}
        >
          <SelectTrigger id="status-filter" className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DISABLED">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
