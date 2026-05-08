import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CreateCategoryForm } from '@/components/categories/create-form';
import { CategoriesTable } from '@/components/categories/categories-table';

export const metadata = { title: 'Categories' };

export default async function CategoriesPage() {
  const actor = await requireRole(['Admin']).catch(() => notFound());

  if (!actor) notFound();

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground">Manage site categories</p>
        </div>
      </div>
      <CreateCategoryForm />
      <CategoriesTable categories={categories ?? []} />
    </div>
  );
}
