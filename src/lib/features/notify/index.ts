import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

type NotificationChannel = Database['public']['Enums']['notification_channel'];

interface NotifyParams {
  recipientId: string;
  type: string;
  payload: Record<string, unknown>;
  channel?: NotificationChannel;
}

export async function notify(params: NotifyParams): Promise<void> {
  const supabase = await createClient();

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('channel')
    .eq('user_id', params.recipientId)
    .eq('event_type', params.type)
    .single();

  const channel = prefs?.channel ?? params.channel ?? 'IN_APP';

  // Email wired in M8 — skip silently for now
  if (channel === 'EMAIL') return;

  const { error } = await supabase.rpc('insert_notification', {
    p_recipient_id: params.recipientId,
    p_type: params.type,
    p_payload: params.payload as never,
    p_channel: channel,
  });

  if (error) {
    console.error('[notify] Failed to insert notification:', error.message);
  }
}
