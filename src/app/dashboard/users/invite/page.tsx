import { requireRole, type UserRole } from '@/lib/features/auth';
import { listManagers } from '../actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InviteUserForm } from '@/components/users/invite-form';
import { BackLink } from '@/components/ui/back-link';

export default async function InviteUserPage() {
  const currentUser = await requireRole(['Admin', 'Manager']);
  const actorRole = currentUser.role as UserRole;
  const managersResult = await listManagers();
  const managers = managersResult.success ? managersResult.data : [];

  return (
    <div className="page">
      <BackLink href="/dashboard/users" label="Users" />

      <div className="page-header">
        <h1 className="page-title">Invite User</h1>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>New invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteUserForm managers={managers} actorRole={actorRole} />
        </CardContent>
      </Card>
    </div>
  );
}
