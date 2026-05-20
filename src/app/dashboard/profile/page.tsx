import { requireUser } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
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

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar size="lg" className="size-20">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
            <AvatarFallback className="text-lg">
              {initials(user.first_name, user.last_name, user.email)}
            </AvatarFallback>
          </Avatar>
        </div>

        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-4 font-semibold">Personal Information</h2>
            <dl>
              <div className="flex items-center justify-start py-1.5 first:pt-0">
                <dt className="w-32 shrink-0 text-muted-foreground">First Name</dt>
                <dd className="font-medium">{user.first_name || '—'}</dd>
              </div>
              <div className="flex items-center justify-start py-1.5">
                <dt className="w-32 shrink-0 text-muted-foreground">Last Name</dt>
                <dd className="font-medium">{user.last_name || '—'}</dd>
              </div>
              <div className="flex items-center justify-start py-1.5">
                <dt className="w-32 shrink-0 text-muted-foreground">Email</dt>
                <dd className="font-medium">{user.email}</dd>
              </div>
              <div className="flex items-center justify-start py-1.5 last:pb-0">
                <dt className="w-32 shrink-0 text-muted-foreground">Role</dt>
                <dd className="font-medium">{user.role ?? '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
