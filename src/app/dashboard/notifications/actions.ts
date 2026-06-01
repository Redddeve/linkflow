'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/features/auth';
import type { ActionResult } from '@/lib/errors';

export async function markNotificationRead(
  id: string,
): Promise<ActionResult> {
  const actor = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recipient_id', actor.id)
    .is('read_at', null);

  if (error) return { success: false, code: 'UNKNOWN', message: error.message };

  revalidatePath('/dashboard/notifications');
  revalidatePath('/dashboard', 'layout');
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const actor = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', actor.id)
    .is('read_at', null);

  if (error) return { success: false, code: 'UNKNOWN', message: error.message };

  revalidatePath('/dashboard/notifications');
  revalidatePath('/dashboard', 'layout');
  return { success: true };
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  const actor = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('recipient_id', actor.id);

  if (error) return { success: false, code: 'UNKNOWN', message: error.message };

  revalidatePath('/dashboard/notifications');
  revalidatePath('/dashboard', 'layout');
  return { success: true };
}

export async function clearReadNotifications(): Promise<ActionResult> {
  const actor = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('recipient_id', actor.id)
    .not('read_at', 'is', null);

  if (error) return { success: false, code: 'UNKNOWN', message: error.message };

  revalidatePath('/dashboard/notifications');
  revalidatePath('/dashboard', 'layout');
  return { success: true };
}
