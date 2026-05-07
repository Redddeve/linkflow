'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function UserFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Search by name or email…"
        defaultValue={searchParams.get('q') ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          const timer = setTimeout(() => update('q', val), 300);
          return () => clearTimeout(timer);
        }}
        className="w-64"
      />
      <Select
        defaultValue={searchParams.get('role') ?? ''}
        onValueChange={(v) => update('role', !v || v === 'all' ? '' : v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All roles</SelectItem>
          <SelectItem value="Client">Client</SelectItem>
          <SelectItem value="Sourcer">Sourcer</SelectItem>
          <SelectItem value="Copywriter">Copywriter</SelectItem>
          <SelectItem value="Manager">Manager</SelectItem>
          <SelectItem value="Admin">Admin</SelectItem>
        </SelectContent>
      </Select>
      <Select
        defaultValue={searchParams.get('status') ?? ''}
        onValueChange={(v) => update('status', !v || v === 'all' ? '' : v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="DISABLED">Disabled</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
