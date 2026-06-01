'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/features/auth';
import { recordAudit } from '@/lib/features/audit';
import type { ActionResult } from '@/lib/errors';
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from '@/lib/schemas/profile';
import { updatePasswordSchema } from '@/lib/schemas/auth';
import { getAppUrl } from '@/lib/utils';

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<ActionResult> {
  const actor = await requireUser();

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: 'VALIDATION',
      message: parsed.error.issues[0].message,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('users')
    .update(parsed.data)
    .eq('id', actor.id);

  if (error) return { success: false, code: 'UNKNOWN', message: error.message };

  await recordAudit({
    entityType: 'user',
    entityId: actor.id,
    action: 'user.profile_update',
    before: {
      first_name: actor.first_name,
      last_name: actor.last_name,
      avatar: actor.avatar,
    },
    after: parsed.data,
  });

  return { success: true };
}

export async function updateOwnPassword(
  currentPassword: string,
  newPassword: string,
): Promise<ActionResult> {
  const actor = await requireUser();

  if (!currentPassword) {
    return { success: false, code: 'VALIDATION', message: 'Current password is required' };
  }

  const parsed = updatePasswordSchema.safeParse({ password: newPassword });
  if (!parsed.success)
    return { success: false, code: 'VALIDATION', message: parsed.error.issues[0].message };

  const supabase = await createClient();

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: actor.email,
    password: currentPassword,
  });
  if (verifyError) {
    return { success: false, code: 'VALIDATION', message: 'Current password is incorrect' };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { success: false, code: 'UNKNOWN', message: error.message };

  await recordAudit({
    entityType: 'user',
    entityId: actor.id,
    action: 'user.password_update',
  });

  return { success: true };
}

export async function sendOwnPasswordReset(): Promise<ActionResult> {
  const actor = await requireUser();

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(actor.email, {
    redirectTo: `${getAppUrl()}/auth/update-password`,
  });
  if (error) return { success: false, code: 'UNKNOWN', message: error.message };

  await recordAudit({
    entityType: 'user',
    entityId: actor.id,
    action: 'user.password_reset_requested',
  });

  return { success: true };
}
