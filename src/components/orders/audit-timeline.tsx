import { fetchOrderAuditTrailPage } from '@/lib/data/audit';
import { fetchUsersWithEmailByIds } from '@/lib/data/users';
import { formatAuditAction } from '@/lib/features/audit-format';
import { Pagination } from '@/components/ui/pagination';

interface Props {
  orderId: string;
  page: number;
  pageSize: number;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString('en-CA');
}

export async function AuditTimeline({ orderId, page, pageSize }: Props) {
  const { rows, total } = await fetchOrderAuditTrailPage(
    orderId,
    page,
    pageSize,
  );
  if (total === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  const actorIds = Array.from(
    new Set(rows.map((r) => r.actor_id).filter((x): x is string => !!x)),
  );
  const userList =
    actorIds.length > 0 ? await fetchUsersWithEmailByIds(actorIds) : [];
  const userMap = Object.fromEntries(userList.map((u) => [u.id, u]));

  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        {rows.map((r) => {
          const actor = r.actor_id ? userMap[r.actor_id] : null;
          const actorName = actor
            ? `${actor.first_name} ${actor.last_name}`.trim() || actor.email
            : 'System';
          return (
            <li key={r.id} className="flex gap-3 text-sm">
              <span
                aria-hidden="true"
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
              />
              <div className="flex-1">
                <div className="font-medium">
                  {formatAuditAction(r.action, r.before, r.after)}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {actorName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(r.occurred_at)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <Pagination total={total} page={page} pageSize={pageSize} />
    </div>
  );
}
