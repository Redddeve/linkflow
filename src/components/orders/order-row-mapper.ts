import type { OrdersListRow } from '@/lib/data/orders';
import type { OrderRow } from './orders-table';

type UserLite = { id: string; first_name: string; last_name: string };

export function toOrderRow(
  o: OrdersListRow,
  userMap: Record<string, UserLite>,
): OrderRow {
  return {
    id: o.id,
    site_domain: o.site_domain,
    status: o.status,
    price_cents: o.price_cents,
    publish_date: o.publish_date ?? '',
    created_at: o.created_at,
    copywriter: o.copywriter_id ? (userMap[o.copywriter_id] ?? null) : null,
    manager: o.manager_id ? (userMap[o.manager_id] ?? null) : null,
    sourcer_payout_cents: o.sourcer_payout_cents,
    sourcer_paid_at: o.sourcer_paid_at,
  };
}
