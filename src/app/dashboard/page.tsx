import { requireUser } from '@/lib/features/auth';
import {
  ClientHome,
  ManagerHome,
  CopywriterHome,
  SourcerHome,
  AdminHome,
} from '@/components/dashboard/home';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await requireUser();

  switch (user.role) {
    case 'Client':
      return <ClientHome user={user} />;
    case 'Manager':
      return <ManagerHome user={user} />;
    case 'Copywriter':
      return <CopywriterHome user={user} />;
    case 'Sourcer':
      return <SourcerHome user={user} />;
    case 'Admin':
      return <AdminHome user={user} />;
    default:
      return (
        <div className="p-8">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is missing a role. Please contact your administrator.
          </p>
        </div>
      );
  }
}
