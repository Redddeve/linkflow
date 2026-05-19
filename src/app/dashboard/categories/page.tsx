import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import {
  fetchCategories,
  fetchCategorySiteCountMap,
} from '@/lib/queries/categories';
import { CreateCategoryForm } from '@/components/categories/create-form';
import { CategoriesTable } from '@/components/categories/categories-table';
import { PageHeader } from '@/components/ui/page-header';

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
    <div>
      <PageHeader title="Categories" description="Manage site categories" />
      <div className="space-y-4">
        <CreateCategoryForm />
        <CategoriesTable categories={categories} siteCountMap={siteCountMap} />
      </div>
    </div>
  );
}
