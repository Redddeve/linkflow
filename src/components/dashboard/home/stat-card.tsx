import Link from 'next/link';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  /** When provided, the card renders as a `<Link>` with hover affordances. */
  href?: string;
  tone?: 'default' | 'warn' | 'success' | 'primary';
  hint?: string;
  className?: string;
}

const toneClass: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-foreground',
  warn: 'text-amber-600',
  success: 'text-(--st-live-fg)',
  primary: 'text-primary',
};

const baseClass =
  'relative block overflow-hidden flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-xs';
const interactiveClass =
  'group transition-all hover:-translate-y-px hover:border-(--border-strong) hover:shadow-sm focus:outline-none focus-visible:ring-3 focus-visible:ring-ring/40';

export function StatCard({
  label,
  value,
  href,
  tone = 'default',
  hint,
  className,
}: StatCardProps) {
  const body = (
    <>
      {href && (
        <span
          className="absolute inset-x-0 top-0 h-0.5 bg-primary opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      )}
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 text-2xl font-semibold tabular-nums leading-tight',
          toneClass[tone],
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn(baseClass, interactiveClass, className)}>
        {body}
      </Link>
    );
  }

  return <div className={cn(baseClass, className)}>{body}</div>;
}

export function SkeletonRow({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border bg-card p-4"
        >
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="mt-2 h-7 w-20 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
