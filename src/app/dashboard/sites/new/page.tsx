import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { SiteForm } from '@/components/sites/site-form';
import { fetchCategories } from '@/lib/data/categories';

export const metadata = { title: 'Add site' };

export default async function NewSitePage() {
  const actor = await requireRole(['Sourcer', 'Manager', 'Admin']).catch(() => notFound());

  const categories = await fetchCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add site</h1>
        <p className="text-sm text-muted-foreground">Submit a new site for review</p>
      </div>
      <SiteForm
        mode="create"
        categories={categories}
        actorRole={actor.role!}
      />
    </div>
  );
}
