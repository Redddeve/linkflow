import { SkeletonRow } from '@/components/dashboard/home/stat-card';

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-32 bg-muted rounded animate-pulse" />
        <div className="h-4 w-48 bg-muted rounded animate-pulse mt-2" />
      </div>
      <SkeletonRow cards={4} />
      <SkeletonRow cards={2} />
    </div>
  );
}
