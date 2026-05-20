import type { Database } from '@/types/database.types';

type UserRole = Database['public']['Enums']['user_role'];

export type RoleHomeKey = 'client' | 'manager' | 'copywriter' | 'sourcer' | 'admin';

export function countByStatus<S extends string>(
  rows: { status: S }[] | null | undefined,
  statuses: readonly S[],
): Record<S, number> {
  const result = Object.fromEntries(statuses.map((s) => [s, 0])) as Record<S, number>;
  if (!rows) return result;
  for (const row of rows) {
    if (row.status in result) {
      result[row.status] += 1;
    }
  }
  return result;
}

export function sumByStatus<S extends string>(
  rows: { status: S; amount_cents: number }[] | null | undefined,
  statuses: readonly S[],
): Record<S, number> {
  const result = Object.fromEntries(statuses.map((s) => [s, 0])) as Record<S, number>;
  if (!rows) return result;
  for (const row of rows) {
    if (row.status in result) {
      result[row.status] += row.amount_cents;
    }
  }
  return result;
}

const ROLE_HOME_MAP: Record<UserRole, RoleHomeKey> = {
  Client: 'client',
  Sourcer: 'sourcer',
  Copywriter: 'copywriter',
  Manager: 'manager',
  Admin: 'admin',
};

export function pickRoleHome(role: UserRole | null | undefined): RoleHomeKey | null {
  if (!role) return null;
  return ROLE_HOME_MAP[role] ?? null;
}
