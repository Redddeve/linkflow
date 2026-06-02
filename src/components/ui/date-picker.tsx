'use client';

import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: string | null;
  onChange?: (date: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  id?: string;
  /**
   * 'day' (default): full calendar, value is `yyyy-MM-dd`.
   * 'month': month grid, value is `yyyy-MM-01` (first day of selected month).
   */
  mode?: 'day' | 'month';
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled,
  minDate,
  maxDate,
  className,
  id,
  mode = 'day',
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selected = value ? parseISO(value) : undefined;

  function handleSelect(date: Date | undefined) {
    onChange?.(date ? format(date, 'yyyy-MM-dd') : null);
    setOpen(false);
  }

  const triggerLabel = selected
    ? mode === 'month'
      ? format(selected, 'MMM yyyy')
      : format(selected, 'MMM d, yyyy')
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            id={id}
            variant="outline"
            className={cn(
              'w-36 h-10 justify-start text-left text-sm font-normal',
              !selected && 'text-muted-foreground',
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
            {triggerLabel}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        {mode === 'month' ? (
          <MonthGrid
            selected={selected}
            minDate={minDate}
            maxDate={maxDate}
            onSelect={handleSelect}
          />
        ) : (
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            disabled={minDate ? (date) => date < minDate : undefined}
            autoFocus
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

interface MonthGridProps {
  selected?: Date;
  minDate?: Date;
  maxDate?: Date;
  onSelect: (date: Date) => void;
}

function MonthGrid({ selected, minDate, maxDate, onSelect }: MonthGridProps) {
  const today = new Date();
  const initialYear = selected
    ? selected.getFullYear()
    : today.getFullYear();
  const [year, setYear] = React.useState(initialYear);

  const selectedYear = selected?.getFullYear();
  const selectedMonth = selected?.getMonth();

  function isMonthDisabled(monthIndex: number): boolean {
    const first = new Date(year, monthIndex, 1);
    const last = new Date(year, monthIndex + 1, 0);
    if (minDate && last < startOfDay(minDate)) return true;
    if (maxDate && first > startOfDay(maxDate)) return true;
    return false;
  }

  return (
    <div className="p-3" data-slot="month-picker">
      <div className="flex items-center justify-between gap-2 pb-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Previous year"
          onClick={() => setYear((y) => y - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="text-sm font-medium select-none">{year}</div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Next year"
          onClick={() => setYear((y) => y + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {MONTH_LABELS.map((label, i) => {
          const isSelected = selectedYear === year && selectedMonth === i;
          const disabled = isMonthDisabled(i);
          return (
            <Button
              key={label}
              type="button"
              variant={isSelected ? 'default' : 'ghost'}
              size="sm"
              disabled={disabled}
              onClick={() => onSelect(new Date(year, i, 1))}
              className="h-9 w-16 text-sm font-normal"
            >
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
