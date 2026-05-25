import { requireRole } from '@/lib/auth';
import { listManagers } from './actions';
import { UserFilters } from '@/components/users/user-filters';
import { UsersTable } from '@/components/users/users-table';
import { InviteUserForm } from '@/components/users/invite-form';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { parsePagination } from '@/lib/pagination';
import { fetchUsersList } from '@/lib/data/users';
import type { UserRole } from '@/lib/auth';
import type { Database } from '@/types/database.types';

type UserStatus = Database['public']['Enums']['user_status'];

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const currentUser = await requireRole(['Admin']);
  const params = await searchParams;
  const { page, pageSize } = parsePagination(params);

  const [{ rows: users, total }, managers] = await Promise.all([
    fetchUsersList({
      role: params.role as UserRole | undefined,
      status: params.status as UserStatus | undefined,
      q: params.q,
      page,
      pageSize,
    }),
    listManagers(),
  ]);

  return (
    <div>
      <PageHeader
        title="Users"
        description={`${total} user${total !== 1 ? 's' : ''}`}
        actions={<InviteUserForm managers={managers} />}
      />
      <div className="space-y-4">
        <UserFilters />
        <UsersTable users={users} currentUserId={currentUser.id} />
        <Pagination total={total} page={page} pageSize={pageSize} />
      </div>
    </div>
  );
}
