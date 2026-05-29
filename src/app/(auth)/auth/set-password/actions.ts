import { createClient } from '@/lib/supabase/client';
import { updatePasswordSchema } from '@/lib/schemas/auth';

export async function setPassword(password: string) {
  const parsed = updatePasswordSchema.safeParse({ password });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) throw error;
}
