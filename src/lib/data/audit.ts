import { createClient } from '@/lib/supabase/server';

export interface AuditTrailRow {
  id: string;
  actor_id: string | null;
  action: string;
  before: unknown;
  after: unknown;
  occurred_at: string;
}

export async function fetchOrderAuditTrailPage(
  orderId: string,
  page: number,
  pageSize: number,
): Promise<{ rows: AuditTrailRow[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count } = await supabase
    .from('audit_log')
    .select('id, actor_id, action, before, after, occurred_at', {
      count: 'exact',
    })
    .eq('entity_type', 'order')
    .eq('entity_id', orderId)
    .order('occurred_at', { ascending: false })
    .range(from, to);
  return { rows: (data ?? []) as AuditTrailRow[], total: count ?? 0 };
}
