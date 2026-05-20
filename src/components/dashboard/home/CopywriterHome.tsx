import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from './stat-card';
import { DashboardHeader, SectionHeading } from './dashboard-header';
import type { UserRow } from '@/lib/auth';
import type { Database } from '@/types/database.types';
import {
  countCopywriterOrders,
  countCopywriterOrdersByStatus,
  fetchCopywriterUpcoming,
} from '@/lib/data/orders';

type OrderStatus = Database['public']['Enums']['order_status'];

const COPYWRITER_ACTIVE: OrderStatus[] = ['New', 'In Progress', 'Needs changes', 'Content Sent'];
const COPYWRITER_UPCOMING: OrderStatus[] = ['In Progress', 'Needs changes'];

export async function CopywriterHome({ user }: { user: UserRow }) {
  const [active, inProgress, needsChanges, upcoming] = await Promise.all([
    countCopywriterOrders(user.id, COPYWRITER_ACTIVE),
    countCopywriterOrdersByStatus(user.id, 'In Progress'),
    countCopywriterOrdersByStatus(user.id, 'Needs changes'),
    fetchCopywriterUpcoming(user.id, COPYWRITER_UPCOMING, 5),
  ]);

  return (
    <div className="space-y-6">
      <DashboardHeader user={user} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          label="Assigned (active)"
          value={active}
          href="/dashboard/orders"
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
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3.5">
            <SectionHeading
              title="Upcoming work"
              description="Next 5 by publish date · In Progress / Needs changes"
            />
          </div>
          {upcoming.length === 0 ? (
            <div className="px-4 pb-4 text-sm text-muted-foreground">
              Nothing to write right now.
            </div>
          ) : (
            <ul className="divide-y border-t border-border">
              {upcoming.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                >
                  <Link
                    href={`/dashboard/orders/${o.id}`}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {o.site_domain}
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {o.publish_date && <span className="tabular-nums">{o.publish_date}</span>}
                    <Badge variant="outline">{o.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
