import { requireRole } from '@/lib/auth';
import { listManagers } from '../actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InviteUserForm } from '@/components/users/invite-form';
import { BackLink } from '@/components/ui/back-link';

export default async function InviteUserPage() {
  await requireRole(['Admin']);
  const managers = await listManagers();

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
          <InviteUserForm managers={managers} />
        </CardContent>
      </Card>
    </div>
  );
}
