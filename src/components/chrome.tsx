'use client';

import Icon from './Icon';
import { NAV, ROLES, STAGES } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export function StageBadge({ stage }: { stage: string }) {
  const map: Record<string, [string, string]> = {
    order:    ['b-new',    'New'],
    assign:   ['b-assign', 'Assigning'],
    content:  ['b-write',  'Writing'],
    approval: ['b-review', 'Client review'],
    publish:  ['b-pub',    'Publishing'],
    done:     ['b-live',   'Live'],
  };
  const [cls, label] = map[stage] ?? ['b-neutral', stage];
  return (
    <span className={cn('badge', cls)}>
      <span className="dot" />{label}
    </span>
  );
}

export function SiteStatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    approved: ['b-live',     'Approved'],
    pending:  ['b-write',    'Pending'],
    rejected: ['b-rejected', 'Rejected'],
  };
  const [cls, label] = map[status] ?? ['b-neutral', status];
  return (
    <span className={cn('badge', cls)}>
      <span className="dot" />{label}
    </span>
  );
}

export function InvoiceBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    paid:    ['b-live',     'Paid'],
    pending: ['b-write',    'Pending'],
    overdue: ['b-rejected', 'Overdue'],
    draft:   ['b-neutral',  'Draft'],
  };
  const [cls, label] = map[status] ?? ['b-neutral', status];
  return (
    <span className={cn('badge', cls)}>
      <span className="dot" />{label}
    </span>
  );
}

export function UserAvatar({ name, size = 'sm' }: { name?: string | null; size?: 'sm' | 'md' }) {
  const initial = (name ?? '?').replace(/[^A-Za-z]/g, '').slice(0, 1).toUpperCase() || '?';
  return (
    <Avatar className={size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-7.5 w-7.5 text-xs'}>
      <AvatarFallback className="bg-(--accent-soft) text-(--accent-text) font-semibold">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}

// Keep legacy name exported for backward compat
export { UserAvatar as Avatar };

export function Sidebar({ role, page, setPage }: { role: string; page: string; setPage: (p: string) => void }) {
  const items = NAV[role] ?? [];
  const roleObj = ROLES.find(r => r.id === role)!;
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">L</div>
        <span>LinkFlow</span>
      </div>
      <div className="role-pill" title="Switch role via Tweaks">
        <div className="avatar">{roleObj.initial}</div>
        <div className="meta">
          <div className="name">{roleObj.name}</div>
          <div className="role">{roleObj.label}</div>
        </div>
      </div>
      <div className="nav-label">Workspace</div>
      {items.map(item => (
        <div
          key={item.id}
          className={cn('nav-item', page === item.id && 'active')}
          onClick={() => setPage(item.id)}
        >
          <span className="nav-icon"><Icon name={item.icon} /></span>
          <span>{item.label}</span>
          {item.count != null && <span className="nav-count">{item.count}</span>}
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <Separator className="my-2 bg-border" />
      <div className="nav-item" style={{ color: 'var(--text-muted)' }}>
        <span className="nav-icon"><Icon name="settings" /></span>
        <span>Settings</span>
      </div>
    </aside>
  );
}

export function Topbar({ crumbs }: { crumbs: string[] }) {
  return (
    <div className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span className="crumb-sep"><Icon name="chev" size={12} /></span>}
            <span className={i === crumbs.length - 1 ? 'crumb-last' : ''}>{c}</span>
          </span>
        ))}
      </div>
      <div className="search">
        <Icon name="search" size={14} />
        <span>Search…</span>
        <kbd>⌘K</kbd>
      </div>
      <div className="topbar-actions">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-(--text-muted)">
          <Icon name="bell" />
        </Button>
        <Avatar className="h-7.5 w-7.5 text-xs">
          <AvatarFallback className="bg-(--accent-soft) text-(--accent-text) font-semibold">U</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="hstack">{actions}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  meta,
  metaTone,
}: {
  label: string;
  value: string | number;
  meta?: string;
  metaTone?: 'up' | 'down';
}) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {meta && <div className={cn('stat-meta', metaTone ?? '')}>{meta}</div>}
    </div>
  );
}

export function Stepper({ currentStage }: { currentStage: string }) {
  const idx = STAGES.findIndex(s => s.id === currentStage);
  return (
    <div className="stepper">
      {STAGES.map((s, i) => {
        const cls = i < idx ? 'done' : i === idx ? 'active' : '';
        return (
          <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div className={cn('step', cls)}>
              <span className="step-num">{i < idx ? '✓' : i + 1}</span>
              <span>{s.label}</span>
            </div>
            {i < STAGES.length - 1 && (
              <span className="step-arrow"><Icon name="chev" size={12} /></span>
            )}
          </span>
        );
      })}
    </div>
  );
}
