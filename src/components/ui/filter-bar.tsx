'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useRef, useState, useCallback } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SelectOption {
  value: string;
  label: string;
}

export type FilterField =
  | {
      type: 'text' | 'number';
      key: string;
      placeholder: string;
      min?: number;
      max?: number;
      className?: string;
    }
  | {
      type: 'select';
      key: string;
      placeholder: string;
      allLabel: string;
      options: SelectOption[];
      className?: string;
    };

interface Props {
  /** Inline search input shown always (outside the collapsible panel). Omit to hide. */
  searchKey?: string;
  searchPlaceholder?: string;
  /** Fields shown inside the collapsible panel when "Filters" is toggled. */
  fields: FilterField[];
  /** URL param keys that count as active filters (drives the "Clear" button). */
  filterKeys: string[];
}

export function FilterBar({ searchKey, searchPlaceholder = 'Search…', fields, filterKeys }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [open, setOpen] = useState(false);

  // Local state map: key → current input value
  const allKeys = [
    ...(searchKey ? [searchKey] : []),
    ...fields.map((f) => f.key),
  ];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(allKeys.map((k) => [k, searchParams.get(k) ?? ''])),
  );

  const hasFilters = filterKeys.some((k) => searchParams.has(k));

  const pushUrl = useCallback(
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

  function handleText(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushUrl(key, val), 300);
  }

  function handleSelect(key: string, val: string | null) {
    const normalized = !val || val === '__all__' ? '' : val;
    setValues((prev) => ({ ...prev, [key]: normalized }));
    pushUrl(key, normalized);
  }

  function clearAll() {
    const reset = Object.fromEntries(allKeys.map((k) => [k, '']));
    setValues(reset);
    const params = new URLSearchParams(searchParams.toString());
    [...filterKeys, ...(searchKey ? [searchKey] : [])].forEach((k) => params.delete(k));
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`);
  }

  function renderField(field: FilterField) {
    if (field.type === 'select') {
      const current = values[field.key] || '__all__';
      const selectedLabel =
        current === '__all__'
          ? field.allLabel
          : (field.options.find((o) => o.value === current)?.label ?? field.allLabel);
      return (
        <Select
          key={field.key}
          value={current}
          onValueChange={(v) => handleSelect(field.key, v)}
        >
          <SelectTrigger className={field.className ?? 'w-44 h-9'}>
            <SelectValue>{selectedLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{field.allLabel}</SelectItem>
            {field.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        key={field.key}
        type={field.type}
        placeholder={field.placeholder}
        min={field.min}
        max={field.max}
        value={values[field.key] ?? ''}
        onChange={(e) => handleText(field.key, e.target.value)}
        className={field.className ?? 'w-36 h-9'}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        {searchKey && (
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={values[searchKey] ?? ''}
            onChange={(e) => handleText(searchKey, e.target.value)}
            className="w-64 h-9"
          />
        )}
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'gap-2',
            open && 'border-primary text-primary bg-primary-soft hover:bg-primary-soft-2',
          )}
          onClick={() => setOpen((o) => !o)}
          aria-pressed={open}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={clearAll}
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </Button>
        )}
      </div>

      {open && fields.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3">
          {fields.map((f) => renderField(f))}
        </div>
      )}
    </div>
  );
}
