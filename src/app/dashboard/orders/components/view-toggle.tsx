'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface Props {
  current: 'list' | 'kanban';
}

export function ViewToggle({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function switchTo(target: 'list' | 'kanban') {
    if (target === current) return;
    const qs = new URLSearchParams(searchParams.toString());
    qs.set('view', target);
    if (target === 'kanban') {
      qs.delete('page');
      qs.delete('limit');
    }
    const s = qs.toString();
    router.push(s ? `${pathname}?${s}` : pathname);
  }

  const base =
    'rounded-md px-3 py-1 text-sm font-medium transition-colors';
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
