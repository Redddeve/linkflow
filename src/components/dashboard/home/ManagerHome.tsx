import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from './stat-card';
import { DashboardHeader, SectionHeading } from './dashboard-header';
import type { UserRow } from '@/lib/features/auth';
import type { Database } from '@/types/database.types';
import {
  countUnassignedOrders,
  countOrdersByStatus,
  fetchManagerRecentActive,
} from '@/lib/data/orders';

type OrderStatus = Database['public']['Enums']['order_status'];

const ACTIVE_NOT_DONE: OrderStatus[] = [
  'New',
  'In Progress',
  'Needs changes',
  'Content Sent',
  'Content Approved',
];

export async function ManagerHome({ user }: { user: UserRow }) {
  const [unassigned, inProgress, needsChanges, awaitingPub, recent] =
    await Promise.all([
      countUnassignedOrders(ACTIVE_NOT_DONE),
      countOrdersByStatus('In Progress'),
      countOrdersByStatus('Needs changes'),
      countOrdersByStatus('Content Approved'),
      fetchManagerRecentActive(ACTIVE_NOT_DONE, 5),
    ]);

  return (
    <div className="space-y-6">
      <DashboardHeader user={user} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Unassigned"
          value={unassigned}
          href="/dashboard/orders?assignee=unassigned"
          tone="warn"
        />
        <StatCard
          label="In Progress"
          value={inProgress}
          href="/dashboard/orders?status=In+Progress"
        />
        <StatCard
          label="Needs changes"
          value={needsChanges}
          href="/dashboard/orders?status=Needs+changes"
          tone="warn"
        />
        <StatCard
          label="Awaiting publication"
          value={awaitingPub}
          href="/dashboard/orders?status=Content+Approved"
          tone="success"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3.5">
            <SectionHeading
              title="Recent active orders"
              description="Last 5 created"
            />
            <Link
              href="/dashboard/orders?view=kanban"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-4 pb-4 text-sm text-muted-foreground">
              No active orders.
            </div>
          ) : (
            <ul className="divide-y border-t border-border">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/dashboard/orders/${o.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                  >
                    <span className="text-sm font-medium">{o.site_domain}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {o.publish_date && (
                        <span className="tabular-nums">{o.publish_date}</span>
                      )}
                      <Badge variant="outline">{o.status}</Badge>
                      {!o.copywriter_id && (
                        <Badge variant="warning">Unassigned</Badge>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
