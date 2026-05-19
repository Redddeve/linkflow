import Link from 'next/link';

interface StatCardProps {
  label: string;
  value: string | number;
  href: string;
  tone?: 'default' | 'warn' | 'success';
  hint?: string;
}

const toneClass: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: '',
  warn: 'text-amber-600',
  success: 'text-emerald-600',
};

export function StatCard({ label, value, href, tone = 'default', hint }: StatCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-md border p-4 transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums mt-1 ${toneClass[tone]}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </Link>
  );
}

export function SkeletonRow({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-md border p-4 animate-pulse">
          <div className="h-3 w-16 bg-muted rounded" />
          <div className="h-7 w-20 bg-muted rounded mt-2" />
        </div>
      ))}
    </div>
  );
}
