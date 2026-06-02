'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
} from '@/lib/features/pagination';

interface Props {
  total: number;
  page: number;
  pageSize: number;
  /** Optional class for the outer wrapper. */
  className?: string;
}

function buildPageList(
  current: number,
  totalPages: number,
): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = [];
  const window = 1; // pages on each side of current
  const first = 1;
  const last = totalPages;

  const include = new Set<number>([first, last, current]);
  for (let i = current - window; i <= current + window; i++) {
    if (i >= first && i <= last) include.add(i);
  }
  const sorted = [...include].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i];
    if (i > 0 && n - sorted[i - 1] > 1) pages.push('ellipsis');
    pages.push(n);
  }
  return pages;
}

export function Pagination({ total, page, pageSize, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (total <= DEFAULT_PAGE_SIZE) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(total, safePage * pageSize);

  function push(nextPage: number, nextSize: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete('page');
    else params.set('page', String(nextPage));
    if (nextSize === DEFAULT_PAGE_SIZE) params.delete('limit');
    else params.set('limit', String(nextSize));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function go(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === safePage) return;
    push(nextPage, pageSize);
  }

  function changeSize(value: string | null) {
    if (!value) return;
    const next = Number(value);
    if (!(PAGE_SIZE_OPTIONS as readonly number[]).includes(next)) return;
    push(1, next);
  }

  const pageItems = buildPageList(safePage, totalPages);

  return (
    <div
      className={cn(
        'flex flex-col-reverse items-center justify-between gap-3 sm:flex-row',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="tabular-nums">
          {total === 0 ? '0 results' : `${start}–${end} of ${total}`}
        </span>
        <span className="hidden sm:inline">·</span>
        <span className="hidden sm:inline">Rows per page</span>
        <Select value={String(pageSize)} onValueChange={changeSize}>
          <SelectTrigger className="h-8 w-18">
            <SelectValue>{pageSize}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={String(opt)}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => go(safePage - 1)}
          disabled={safePage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          {/* <span className="hidden sm:inline">Previous</span> */}
        </Button>

        {pageItems.map((item, idx) =>
          item === 'ellipsis' ? (
            <span
              key={`e-${idx}`}
              className="px-2 text-sm text-muted-foreground"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              variant={item === safePage ? 'default' : 'outline'}
              size="sm"
              className="min-w-8 px-2 tabular-nums"
              onClick={() => go(item)}
              aria-label={`Page ${item}`}
              aria-current={item === safePage ? 'page' : undefined}
            >
              {item}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => go(safePage + 1)}
          disabled={safePage >= totalPages}
          aria-label="Next page"
        >
          {/* <span className="hidden sm:inline">Next</span> */}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
