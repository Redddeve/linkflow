'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/schemas/auth';

export async function loginWithPassword(email: string, password: string) {
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  redirect('/dashboard');
}
