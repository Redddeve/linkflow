'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  function toggle(option: string) {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  }

  function remove(option: string, e: React.MouseEvent | React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    onChange(value.filter((v) => v !== option));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-expanded={open}
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'h-auto min-h-9 w-full justify-between font-normal',
          className,
        )}
      >
        <span className="flex flex-wrap gap-1">
          {value.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            value.map((v) => (
              <Badge key={v} variant="secondary" className="text-xs">
                {v}
                {/* Real <button type="button"> + pointerDown stop, so clicking
                    the X never bubbles to the popover trigger or submits the
                    enclosing form (which was scrolling the page to top). */}
                <span
                  role="button"
                  tabIndex={0}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => remove(v, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(value.filter((x) => x !== v));
                    }
                  }}
                  className="ml-1 rounded-full outline-none hover:text-foreground cursor-pointer"
                  aria-label={`Remove ${v}`}
                >
                  <X className="h-3 w-3" />
                </span>
              </Badge>
            ))
          )}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent
        className="w-(--anchor-width) p-0"
        align="start"
        /* Prevent base-ui from auto-focusing the input on open — focus would
           trigger a window scrollIntoView, jumping the page to the top of the
           form. We'll let the user click the input or use keyboard to focus. */
        initialFocus={false}
      >
        <Command>
          <CommandInput placeholder="Search…" autoFocus={false} />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option} value={option} onSelect={() => toggle(option)}>
                  <Check
                    className={cn('mr-2 h-4 w-4', value.includes(option) ? 'opacity-100' : 'opacity-0')}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
