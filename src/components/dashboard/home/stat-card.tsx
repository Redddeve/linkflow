import Link from 'next/link';

interface StatCardProps {
  label: string;
  value: string | number;
  href: string;
  tone?: 'default' | 'warn' | 'success' | 'primary';
  hint?: string;
}

const toneClass: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-foreground',
  warn: 'text-amber-600',
  success: 'text-(--st-live-fg)',
  primary: 'text-primary',
};

export function StatCard({ label, value, href, tone = 'default', hint }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:-translate-y-px hover:border-(--border-strong) hover:shadow-sm focus:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <span
        className="absolute inset-x-0 top-0 h-0.5 bg-primary opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums leading-tight ${toneClass[tone]}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Link>
  );
}

export function SkeletonRow({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-4">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="mt-2 h-7 w-20 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
