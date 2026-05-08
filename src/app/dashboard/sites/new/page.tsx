import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SiteForm } from '@/components/sites/site-form';

export const metadata = { title: 'Add site' };

export default async function NewSitePage() {
  const actor = await requireRole(['Sourcer', 'Manager', 'Admin']).catch(() => notFound());

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add site</h1>
        <p className="text-sm text-muted-foreground">Submit a new site for review</p>
      </div>
      <SiteForm
        mode="create"
        categories={categories ?? []}
        actorRole={actor.role!}
      />
    </div>
  );
}
