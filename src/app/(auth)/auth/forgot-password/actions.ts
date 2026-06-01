'use server';

import { createClient } from '@/lib/supabase/server';
import { emailSchema } from '@/lib/schemas/auth';
import { getAppUrl } from '@/lib/utils';
import type { ActionResult } from '@/lib/errors';

export async function resetPasswordForEmail(
  email: string,
): Promise<ActionResult> {
  const parsed = emailSchema.safeParse({ email });
  if (!parsed.success) {
    return {
      success: false,
      code: 'VALIDATION',
      message: parsed.error.issues[0].message,
    };
  }

  const supabase = await createClient();

  const { data: exists, error: lookupError } = await supabase.rpc(
    'check_user_email_exists',
    { lookup_email: parsed.data.email },
  );

  if (lookupError) {
    return {
      success: false,
      code: 'UNKNOWN',
      message: 'Something went wrong. Please try again later.',
    };
  }

  if (!exists) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'No account found with that email address.',
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
      code: 'UNKNOWN',
      message: 'Something went wrong. Please try again later.',
    };
  }

  return { success: true };
}
