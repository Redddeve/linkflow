import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { listManagers } from '../actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EditUserForm } from './edit-form';
import { StatusActions } from './status-actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' {
  if (status === 'ACTIVE') return 'default';
  if (status === 'PENDING') return 'secondary';
  return 'destructive';
}

export default async function UserDetailPage({ params }: PageProps) {
  const currentUser = await requireRole(['Admin']);
  const { id } = await params;

  const supabase = await createClient();
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !user) notFound();

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
        <div>
          <h1 className="page-title">
            {user.first_name} {user.last_name}
          </h1>
          <p className="page-subtitle">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusVariant(user.status)}>
            {user.status === 'ACTIVE' ? 'Active' : user.status === 'PENDING' ? 'Pending' : 'Disabled'}
          </Badge>
          <StatusActions user={user} currentUserId={currentUser.id} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <Badge variant="outline">{user.role ?? '—'}</Badge>
            </div>
            {user.invited_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invited</span>
                <span>{new Date(user.invited_at).toLocaleDateString()}</span>
              </div>
            )}
            {user.disabled_reason && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Disabled reason</span>
                <span className="text-destructive">{user.disabled_reason}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edit</CardTitle>
          </CardHeader>
          <CardContent>
            <EditUserForm user={user} managers={managers} />
          </CardContent>
        </Card>
      </div>

      <Separator className="my-6" />

      <p className="text-sm text-muted-foreground">
        Activity timeline will be available in a future update.
      </p>
    </div>
  );
}
