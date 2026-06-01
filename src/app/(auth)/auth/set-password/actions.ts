import { createClient } from '@/lib/supabase/client';
import { updatePasswordSchema } from '@/lib/schemas/auth';
import type { ActionResult } from '@/lib/errors';

export async function setPassword(password: string): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse({ password });
  if (!parsed.success) {
    return {
      success: false,
      code: 'VALIDATION',
      message: parsed.error.issues[0].message,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { success: false, code: 'UNKNOWN', message: error.message };

  return { success: true };
}
