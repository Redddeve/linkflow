import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from './stat-card';
import type { UserRow } from '@/lib/auth';
import type { Database } from '@/types/database.types';

type OrderStatus = Database['public']['Enums']['order_status'];

const ACTIVE_NOT_DONE: OrderStatus[] = [
  'New',
  'In Progress',
  'Needs changes',
  'Content Sent',
  'Content Approved',
];

export async function ManagerHome({ user }: { user: UserRow }) {
  const supabase = await createClient();

  const [unassignedRes, inProgressRes, needsChangesRes, awaitingPubRes, recentRes] =
    await Promise.all([
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .is('copywriter_id', null)
        .in('status', ACTIVE_NOT_DONE),
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'In Progress'),
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Needs changes'),
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Content Approved'),
      supabase
        .from('orders')
        .select('id, site_domain, status, copywriter_id, publish_date')
        .in('status', ACTIVE_NOT_DONE)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

  const recent = recentRes.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user.first_name || user.email}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Unassigned"
          value={unassignedRes.count ?? 0}
          href="/dashboard/orders?assignee=unassigned"
          tone="warn"
        />
        <StatCard
          label="In Progress"
          value={inProgressRes.count ?? 0}
          href="/dashboard/orders?status=In+Progress"
        />
        <StatCard
          label="Needs changes"
          value={needsChangesRes.count ?? 0}
          href="/dashboard/orders?status=Needs+changes"
          tone="warn"
        />
        <StatCard
          label="Awaiting publication"
          value={awaitingPubRes.count ?? 0}
          href="/dashboard/orders?status=Content+Approved"
          tone="success"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm font-medium">Recent active orders</div>
              <div className="text-xs text-muted-foreground">Last 5 created</div>
            </div>
            <Link
              href="/dashboard/orders?view=kanban"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="p-4 pt-0 text-sm text-muted-foreground">No active orders.</div>
          ) : (
            <ul className="divide-y border-t">
              {recent.map((o) => (
                <li key={o.id} className="px-4 py-3 flex items-center justify-between">
                  <Link
                    href={`/dashboard/orders/${o.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {o.site_domain}
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {o.publish_date && <span>{o.publish_date}</span>}
                    <Badge variant="outline">{o.status}</Badge>
                    {!o.copywriter_id && (
                      <Badge variant="secondary" className="text-amber-700">
                        Unassigned
                      </Badge>
                    )}
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
