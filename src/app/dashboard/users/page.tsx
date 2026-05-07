import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { buttonVariants } from '@/components/ui/button';
import { UserFilters } from './filters';
import { UsersTable } from './users-table';
import type { UserRole } from '@/lib/auth';

interface PageProps {
  searchParams: Promise<{ role?: string; status?: string; q?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const currentUser = await requireRole(['Admin']);
  const { role, status, q } = await searchParams;

  const supabase = await createClient();
  let query = supabase.from('users').select('*').order('first_name');

  if (role) query = query.eq('role', role as UserRole);
  if (status) query = query.eq('status', status as 'PENDING' | 'ACTIVE' | 'DISABLED');
  if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`);

  const { data: users } = await query;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">{users?.length ?? 0} user{users?.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/dashboard/users/invite" className={buttonVariants()}>
          Invite User
        </Link>
      </div>

      <div className="mb-4">
        <UserFilters />
      </div>

      <UsersTable users={users ?? []} currentUserId={currentUser.id} />
    </div>
  );
}
