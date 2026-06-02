'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  addMonths,
  isValidBillingMonth,
  type BillingMonth,
} from '@/lib/features/billing';

export interface SourcerOption {
  value: string;
  label: string;
}

interface Props {
  currentMonth: BillingMonth;
  showSourcer: boolean;
  sourcerOptions: SourcerOption[];
  currentSourcer?: string;
}

export function EarningsFilters({
  currentMonth,
  showSourcer,
  sourcerOptions,
  currentSourcer,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function pushParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function setMonthFromPicker(yyyyMmDd: string | null) {
    if (!yyyyMmDd) return;
    const yyyyMm01 = `${yyyyMmDd.slice(0, 7)}-01`;
    if (!isValidBillingMonth(yyyyMm01)) return;
    pushParam('month', yyyyMm01);
  }

  function step(delta: number) {
    pushParam('month', addMonths(currentMonth, delta));
  }

  function setSourcer(v: string | null) {
    pushParam('sourcer', !v || v === '__all__' ? null : v);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => step(-1)}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
        Prev
      </Button>
      <DatePicker
        mode="month"
        value={currentMonth}
        onChange={setMonthFromPicker}
        className="w-40 h-9"
        placeholder="Pick a month"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => step(1)}
        aria-label="Next month"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>

      {showSourcer && (
        <Select
          items={{
            __all__: 'All sourcers',
            ...Object.fromEntries(
              sourcerOptions.map((o) => [o.value, o.label]),
            ),
          }}
          value={currentSourcer || '__all__'}
          onValueChange={setSourcer}
        >
          <SelectTrigger className="w-56 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All sourcers</SelectItem>
            {sourcerOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
