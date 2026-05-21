import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { BackLink } from '@/components/ui/back-link';
import { fetchUserById } from '@/lib/data/users';
import { listManagers } from '../actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EditUserDialog } from '@/components/users/edit-dialog';
import { StatusActions } from '@/components/users/status-actions';

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

function statusLabel(status: string) {
  if (status === 'ACTIVE') return 'Active';
  if (status === 'PENDING') return 'Pending';
  return 'Disabled';
}

export default async function UserDetailPage({ params }: PageProps) {
  const currentUser = await requireRole(['Admin']);
  const { id } = await params;

  const { data: user, error } = await fetchUserById(id);

  if (error || !user) notFound();

  const managers = await listManagers();

  const details: { label: string; value: React.ReactNode }[] = [
    { label: 'First Name', value: user.first_name ?? '—' },
    { label: 'Last Name', value: user.last_name ?? '—' },
    { label: 'Email', value: user.email },
    { label: 'Role', value: user.role ?? '—' },
    {
      label: 'Status',
      value: (
        <Badge variant={statusVariant(user.status)}>
          {statusLabel(user.status)}
        </Badge>
      ),
    },
  ];

  if (user.invited_at) {
    details.push({
      label: 'Created',
      value: new Date(user.invited_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    });
  }

  return (
    <div className="space-y-6">
      <BackLink href="/dashboard/users" label="Users" />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight leading-tight">
            {user.first_name} {user.last_name}
          </h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <EditUserDialog user={user} managers={managers} />
          <StatusActions user={user} currentUserId={currentUser.id} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {details.map((d) => (
                <div key={d.label} className="space-y-1">
                  <dt className="text-muted-foreground">{d.label}</dt>
                  <dd className="font-medium">{d.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {user.disabled_reason && (
          <Card className="lg:col-span-1 h-fit border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">
                Disabled reason
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap text-destructive">
                {user.disabled_reason}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
