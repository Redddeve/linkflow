'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/features/auth';

export async function markNotificationRead(id: string): Promise<void> {
  const actor = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recipient_id', actor.id)
    .is('read_at', null);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/notifications');
  revalidatePath('/dashboard', 'layout');
}

export async function markAllNotificationsRead(): Promise<void> {
  const actor = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', actor.id)
    .is('read_at', null);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/notifications');
  revalidatePath('/dashboard', 'layout');
}

export async function deleteNotification(id: string): Promise<void> {
  const actor = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('recipient_id', actor.id);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/notifications');
  revalidatePath('/dashboard', 'layout');
}

export async function clearReadNotifications(): Promise<void> {
  const actor = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('recipient_id', actor.id)
    .not('read_at', 'is', null);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/notifications');
  revalidatePath('/dashboard', 'layout');
}
