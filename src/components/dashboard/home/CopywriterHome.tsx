import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from './stat-card';
import type { UserRow } from '@/lib/auth';
import type { Database } from '@/types/database.types';

type OrderStatus = Database['public']['Enums']['order_status'];

const COPYWRITER_ACTIVE: OrderStatus[] = ['New', 'In Progress', 'Needs changes', 'Content Sent'];
const COPYWRITER_UPCOMING: OrderStatus[] = ['In Progress', 'Needs changes'];

export async function CopywriterHome({ user }: { user: UserRow }) {
  const supabase = await createClient();

  const [activeRes, inProgressRes, needsChangesRes, upcomingRes] = await Promise.all([
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('copywriter_id', user.id)
      .in('status', COPYWRITER_ACTIVE),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('copywriter_id', user.id)
      .eq('status', 'In Progress'),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('copywriter_id', user.id)
      .eq('status', 'Needs changes'),
    supabase
      .from('orders')
      .select('id, site_domain, status, publish_date')
      .eq('copywriter_id', user.id)
      .in('status', COPYWRITER_UPCOMING)
      .order('publish_date', { ascending: true, nullsFirst: false })
      .limit(5),
  ]);

  const upcoming = upcomingRes.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user.first_name || user.email}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          label="Assigned (active)"
          value={activeRes.count ?? 0}
          href="/dashboard/orders"
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
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm font-medium">Upcoming work</div>
              <div className="text-xs text-muted-foreground">
                Next 5 by publish date · In Progress / Needs changes
              </div>
            </div>
          </div>
          {upcoming.length === 0 ? (
            <div className="p-4 pt-0 text-sm text-muted-foreground">Nothing to write right now.</div>
          ) : (
            <ul className="divide-y border-t">
              {upcoming.map((o) => (
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
