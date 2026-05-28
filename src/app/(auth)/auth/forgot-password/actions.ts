'use server';

import { createClient } from '@/lib/supabase/server';
import { emailSchema } from '@/lib/schemas/auth';
import { getAppUrl } from '@/lib/utils';

export async function resetPasswordForEmail(email: string) {
  const parsed = emailSchema.safeParse({ email });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const supabase = await createClient();

  const { data: exists, error: lookupError } = await supabase.rpc(
    'check_user_email_exists',
    { lookup_email: parsed.data.email },
  );

  if (lookupError) {
    return {
      success: false,
      error: 'Something went wrong. Please try again later.',
    };
  }

  if (!exists) {
    return {
      success: false,
      error: 'No account found with that email address.',
    };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${getAppUrl()}/auth/update-password`,
    },
  );

  if (error) {
    return {
      success: false,
      error: 'Something went wrong. Please try again later.',
    };
  }

  return { success: true };
}
