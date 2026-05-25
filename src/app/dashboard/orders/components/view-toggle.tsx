'use client';

import { useRouter, usePathname } from 'next/navigation';

interface Props {
  current: 'list' | 'kanban';
}

export function ViewToggle({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(target: 'list' | 'kanban') {
    if (target === current) return;
    // Persist the user's choice for future visits without a ?view= param.
    // 1 year is long enough to feel sticky; SameSite=Lax so it travels with normal navigation.
    document.cookie = `orders_view=${target}; path=/; max-age=31536000; SameSite=Lax`;
    // Switching views always clears filters/pagination so the user starts fresh.
    router.push(`${pathname}?view=${target}`);
  }

  const base =
    'cursor-pointer rounded-md px-3 py-1 text-sm font-medium transition-colors';
  const active = 'bg-primary text-primary-foreground shadow-xs';
  const inactive = 'text-muted-foreground hover:text-foreground';

  return (
    <div
      role="group"
      aria-label="View mode"
      className="inline-flex rounded-lg border border-border bg-card p-0.5 shadow-xs"
    >
      <button
        type="button"
        aria-pressed={current === 'list'}
        onClick={() => switchTo('list')}
        className={`${base} ${current === 'list' ? active : inactive}`}
      >
        List
      </button>
      <button
        type="button"
        aria-pressed={current === 'kanban'}
        onClick={() => switchTo('kanban')}
        className={`${base} ${current === 'kanban' ? active : inactive}`}
      >
        Kanban
      </button>
    </div>
  );
}
