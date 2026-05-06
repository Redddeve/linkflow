import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';
import type { Database } from '@/types/database.types';

export type UserRow = Database['public']['Tables']['users']['Row'];
export type UserRole = Database['public']['Enums']['user_role'];

export async function getCurrentUser(): Promise<UserRow | null> {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.claims.sub)
    .single();

  if (error || !user) return null;

  // PENDING → ACTIVE on first authenticated request
  if (user.status === 'PENDING') {
    await supabase
      .from('users')
      .update({ status: 'ACTIVE' })
      .eq('id', user.id)
      .eq('status', 'PENDING');
    return { ...user, status: 'ACTIVE' };
  }

  return user;
}

export async function requireUser(): Promise<UserRow> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireRole(roles: UserRole[]): Promise<UserRow> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new Error(`FORBIDDEN: requires role ${roles.join(' or ')}`);
  }
  return user;
}
