import { createClient } from '@/lib/supabase/server';

export interface AuditTrailRow {
  id: string;
  actor_id: string | null;
  action: string;
  before: unknown;
  after: unknown;
  occurred_at: string;
}

export async function fetchOrderAuditTrail(
  orderId: string,
): Promise<AuditTrailRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('audit_log')
    .select('id, actor_id, action, before, after, occurred_at')
    .eq('entity_type', 'order')
    .eq('entity_id', orderId)
    .order('occurred_at', { ascending: true });
  return (data ?? []) as AuditTrailRow[];
}
