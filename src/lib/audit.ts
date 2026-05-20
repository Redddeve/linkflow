import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database.types';

interface AuditParams {
  entityType: 'site' | 'order' | 'user' | 'invoice' | 'commission' | 'chat';
  entityId: string;
  action: string;
  before?: Json;
  after?: Json;
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
    p_before: params.before ?? null,
    p_after: params.after ?? null,
  });

  if (error) {
    console.error('[audit] Failed to record audit log:', error.message);
  }
}
