'use client';

import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
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
  className?: string;
  id?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled,
  minDate,
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selected = value ? parseISO(value) : undefined;

  function handleSelect(date: Date | undefined) {
    onChange?.(date ? format(date, 'yyyy-MM-dd') : null);
    setOpen(false);
  }

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
            {selected ? format(selected, 'MMM d, yyyy') : placeholder}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          disabled={minDate ? (date) => date < minDate : undefined}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
