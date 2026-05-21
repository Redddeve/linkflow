import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';
import type { UserRole } from '@/lib/auth';

type UserStatus = Database['public']['Enums']['user_status'];
type UsersRow = Database['public']['Tables']['users']['Row'];

export interface UsersListFilters {
  role?: UserRole;
  status?: UserStatus;
  q?: string;
}

export async function fetchUsersList(filters: UsersListFilters): Promise<UsersRow[]> {
  const supabase = await createClient();
  let query = supabase.from('users').select('*').order('first_name');

  if (filters.role) query = query.eq('role', filters.role);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.q) {
    query = query.or(
      `first_name.ilike.%${filters.q}%,last_name.ilike.%${filters.q}%,email.ilike.%${filters.q}%`,
    );
  }

  const { data } = await query;
  return data ?? [];
}

export async function fetchUserById(id: string) {
  const supabase = await createClient();
  return supabase.from('users').select('*').eq('id', id).single();
}

export async function fetchUsersByIds(
  ids: string[],
): Promise<{ id: string; first_name: string; last_name: string; role: UserRole | null }[]> {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id, first_name, last_name, role')
    .in('id', ids);
  return data ?? [];
}

export async function fetchUsersWithEmailByIds(
  ids: string[],
): Promise<{ id: string; first_name: string; last_name: string; email: string }[]> {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id, first_name, last_name, email')
    .in('id', ids);
  return data ?? [];
}

export async function fetchActiveByRole(
  role: UserRole,
): Promise<{ id: string; first_name: string; last_name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('role', role)
    .eq('status', 'ACTIVE')
    .order('first_name');
  return data ?? [];
}

export async function countUsersByStatus(status: UserStatus): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('status', status);
  return count ?? 0;
}
