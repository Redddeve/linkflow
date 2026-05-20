'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { AppError } from '@/lib/errors';
import { updateProfileSchema, type UpdateProfileInput } from '@/lib/schemas/profile';
import { updatePasswordSchema } from '@/lib/schemas/auth';

export async function updateProfile(input: UpdateProfileInput): Promise<void> {
  const actor = await requireUser();

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const supabase = await createClient();
  const { error } = await supabase
    .from('users')
    .update(parsed.data)
    .eq('id', actor.id);

  if (error) throw new Error(error.message);

  await recordAudit({
    entityType: 'user',
    entityId: actor.id,
    action: 'user.profile_update',
    before: { first_name: actor.first_name, last_name: actor.last_name, avatar: actor.avatar },
    after: parsed.data,
  });
}

export async function updateOwnPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const actor = await requireUser();

  if (!currentPassword) {
    throw new AppError('VALIDATION', 'Current password is required');
  }

  const parsed = updatePasswordSchema.safeParse({ password: newPassword });
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const supabase = await createClient();

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: actor.email,
    password: currentPassword,
  });
  if (verifyError) {
    throw new AppError('VALIDATION', 'Current password is incorrect');
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) throw new Error(error.message);

  await recordAudit({
    entityType: 'user',
    entityId: actor.id,
    action: 'user.password_update',
  });
}

export async function sendOwnPasswordReset(): Promise<void> {
  const actor = await requireUser();

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const { error } = await supabase.auth.resetPasswordForEmail(actor.email, {
    redirectTo: `${siteUrl}/auth/update-password`,
  });
  if (error) throw new Error(error.message);

  await recordAudit({
    entityType: 'user',
    entityId: actor.id,
    action: 'user.password_reset_requested',
  });
}
