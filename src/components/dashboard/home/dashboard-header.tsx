import { PageHeader } from '@/components/ui/page-header';
import type { UserRow } from '@/lib/features/auth';

export function DashboardHeader({
  user,
  title = 'Dashboard',
}: {
  user: UserRow;
  title?: string;
}) {
  return (
    <PageHeader
      title={title}
      description={`Welcome back, ${user.first_name || user.email}`}
    />
  );
}

export function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-2.5">
      <div className="text-sm font-medium">{title}</div>
      {description && (
        <div className="text-xs text-muted-foreground">{description}</div>
      )}
    </div>
  );
}
