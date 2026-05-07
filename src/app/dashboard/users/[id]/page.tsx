import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { listManagers } from '../actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EditUserDialog } from './edit-form';
import { StatusActions } from './status-actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

function statusVariant(
  status: string,
): 'success' | 'warning' | 'destructive' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'PENDING') return 'warning';
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
      <div className="mb-6">
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
        <div className="flex items-center gap-2">
          <EditUserDialog user={user} managers={managers} />
          <StatusActions user={user} currentUserId={currentUser.id} />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <dl>
            <div className="flex items-center justify-start py-1.5 first:pt-0 last:pb-0">
              <dt className="text-muted-foreground w-32 shrink-0">
                First Name
              </dt>
              <dd className="font-medium">{user.first_name ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-start py-1.5">
              <dt className="text-muted-foreground w-32 shrink-0">Last Name</dt>
              <dd className="font-medium">{user.last_name ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-start py-1.5">
              <dt className="text-muted-foreground w-32 shrink-0">Email</dt>
              <dd className="font-medium">{user.email}</dd>
            </div>
            <div className="flex items-center justify-start py-1.5">
              <dt className="text-muted-foreground w-32 shrink-0">Role</dt>
              <dd className="font-medium">{user.role ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-start py-1.5">
              <dt className="text-muted-foreground w-32 shrink-0">Status</dt>
              <dd>
                <Badge variant={statusVariant(user.status)}>
                  {user.status === 'ACTIVE'
                    ? 'Active'
                    : user.status === 'PENDING'
                      ? 'Pending'
                      : 'Disabled'}
                </Badge>
              </dd>
            </div>
            {user.invited_at && (
              <div className="flex items-center justify-start py-1.5">
                <dt className="text-muted-foreground w-32 shrink-0">Created</dt>
                <dd className="font-medium">
                  {new Date(user.invited_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
            )}
            {user.disabled_reason && (
              <div className="flex items-start justify-start py-1.5 last:pb-0">
                <dt className="text-muted-foreground w-32 shrink-0">
                  Disabled reason
                </dt>
                <dd className="text-destructive">{user.disabled_reason}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
