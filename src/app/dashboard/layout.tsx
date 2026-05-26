import { requireUser } from '@/lib/features/auth';
import { DashboardShell } from '@/components/dashboard/shell';
import { ensureAutoChats } from '@/app/dashboard/chat/actions';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (user.role === 'Client') {
    await ensureAutoChats();
  }
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
