'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Category {
  id: string;
  name: string;
}

interface Props {
  categories: Category[];
}

export function SitesFilters({ categories }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`);
  }

  function handleStatusChange(v: string | null) {
    update('status', !v || v === 'All' ? '' : v);
  }

  function handleCategoryChange(v: string | null) {
    update('category', !v || v === 'All' ? '' : v);
  }

  function handlePriceMinBlur(e: React.FocusEvent<HTMLInputElement>) {
    update('price_min', e.target.value);
  }

  function handlePriceMaxBlur(e: React.FocusEvent<HTMLInputElement>) {
    update('price_max', e.target.value);
  }

  return (
    <div role="search" className="flex flex-wrap gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="status-filter" className="sr-only">Filter by status</label>
        <Select
          value={searchParams.get('status') ?? 'All'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger id="status-filter" className="w-44 h-9">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Needs changes">Needs changes</SelectItem>
            <SelectItem value="Archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="category-filter" className="sr-only">Filter by category</label>
        <Select
          value={searchParams.get('category') ?? 'All'}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger id="category-filter" className="w-44 h-9">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="price-min" className="sr-only">Min price</label>
        <Input
          id="price-min"
          type="number"
          min={0}
          placeholder="Min $ price"
          className="w-32 h-9"
          defaultValue={searchParams.get('price_min') ?? ''}
          onBlur={handlePriceMinBlur}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="price-max" className="sr-only">Max price</label>
        <Input
          id="price-max"
          type="number"
          min={0}
          placeholder="Max $ price"
          className="w-32 h-9"
          defaultValue={searchParams.get('price_max') ?? ''}
          onBlur={handlePriceMaxBlur}
        />
      </div>
    </div>
  );
}
