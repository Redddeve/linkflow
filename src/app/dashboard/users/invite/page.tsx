import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { listManagers } from '../actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InviteUserForm } from '@/components/users/invite-form';

export default async function InviteUserPage() {
  await requireRole(['Admin']);
  const managers = await listManagers();

  return (
    <div className="page">
      <div className="mb-4">
        <Link
          href="/dashboard/users"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Users
        </Link>
      </div>

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
