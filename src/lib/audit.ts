import { createClient } from '@/lib/supabase/server';

interface AuditParams {
  entityType: 'site' | 'order' | 'user' | 'invoice' | 'commission';
  entityId: string;
  action: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export async function recordAudit(params: AuditParams): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const actorId = data?.claims?.sub ?? null;

  const { error } = await supabase.rpc('insert_audit_log', {
    p_actor_id: actorId ?? '',
    p_entity_type: params.entityType,
    p_entity_id: params.entityId,
    p_action: params.action,
    p_before: (params.before ?? null) as never,
    p_after: (params.after ?? null) as never,
  });

  if (error) {
    console.error('[audit] Failed to record audit log:', error.message);
  }
}
