'use client';

import { createClient } from '@/lib/supabase/client';
import { emailSchema } from '@/lib/schemas/auth';

export async function resetPasswordForEmail(email: string) {
  const parsed = emailSchema.safeParse({ email });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${window.location.origin}/auth/update-password`,
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
