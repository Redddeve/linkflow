'use client';

import { createClient } from '@/lib/supabase/client';
import { loginSchema } from '@/lib/schemas/auth';

export async function loginWithPassword(email: string, password: string) {
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) throw error;
}
