import { requireRole } from '@/lib/auth';
import { listManagers } from './actions';
import { UserFilters } from '@/components/users/user-filters';
import { UsersTable } from '@/components/users/users-table';
import { InviteUserForm } from '@/components/users/invite-form';
import { PageHeader } from '@/components/ui/page-header';
import { fetchUsersList } from '@/lib/data/users';
import type { UserRole } from '@/lib/auth';
import type { Database } from '@/types/database.types';

type UserStatus = Database['public']['Enums']['user_status'];

interface PageProps {
  searchParams: Promise<{ role?: string; status?: string; q?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const currentUser = await requireRole(['Admin']);
  const { role, status, q } = await searchParams;

  const [users, managers] = await Promise.all([
    fetchUsersList({
      role: role as UserRole | undefined,
      status: status as UserStatus | undefined,
      q,
    }),
    listManagers(),
  ]);

  return (
    <div>
      <PageHeader
        title="Users"
        description={`${users.length} user${users.length !== 1 ? 's' : ''}`}
        actions={<InviteUserForm managers={managers} />}
      />
      <div className="space-y-4">
        <UserFilters />
        <UsersTable users={users} currentUserId={currentUser.id} />
      </div>
    </div>
  );
}
