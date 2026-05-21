import { requireUser } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { avatarPublicUrl } from '@/lib/avatar';
import { EditProfileDialog } from '@/components/profile/edit-profile-dialog';
import { ChangeCredentialsDialog } from '@/components/profile/change-credentials-dialog';

function initials(first: string, last: string, email: string) {
  const f = first.trim();
  const l = last.trim();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f) return f[0].toUpperCase();
  return (email[0] ?? '?').toUpperCase();
}

export default async function ProfilePage() {
  const user = await requireUser();
  const avatarUrl = avatarPublicUrl(user.avatar);

  const details: { label: string; value: React.ReactNode }[] = [
    { label: 'First Name', value: user.first_name || '—' },
    { label: 'Last Name', value: user.last_name || '—' },
    { label: 'Email', value: user.email },
    { label: 'Role', value: user.role ?? '—' },
  ];

  return (
    <div>
      <PageHeader
        title="Profile"
        actions={
          <>
            <EditProfileDialog user={user} />
            <ChangeCredentialsDialog />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <Avatar size="lg" className="size-24">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
              <AvatarFallback className="text-2xl">
                {initials(user.first_name, user.last_name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-0.5">
              <p className="text-base font-semibold">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            {user.role && (
              <div className="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary-text">
                {user.role}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personal information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {details.map((d) => (
                <div key={d.label} className="space-y-1">
                  <dt className="text-muted-foreground">{d.label}</dt>
                  <dd className="font-medium text-base">{d.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
