import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import {
  fetchCategories,
  fetchCategorySiteCountMap,
} from '@/lib/queries/categories';
import { CreateCategoryForm } from '@/components/categories/create-form';
import { CategoriesTable } from '@/components/categories/categories-table';

export const metadata = { title: 'Categories' };

export default async function CategoriesPage() {
  const actor = await requireRole(['Admin']).catch(() => notFound());

  if (!actor) notFound();

  const [categoriesResult, siteCountMapResult] = await Promise.allSettled([
    fetchCategories(),
    fetchCategorySiteCountMap(),
  ]);

  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
  const siteCountMap = siteCountMapResult.status === 'fulfilled' ? siteCountMapResult.value : {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Manage site categories
          </p>
        </div>
      </div>
      <CreateCategoryForm />
      <CategoriesTable categories={categories} siteCountMap={siteCountMap} />
    </div>
  );
}
