import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import {
  fetchCategoriesPage,
  fetchCategorySiteCountMap,
} from '@/lib/data/categories';
import { CreateCategoryForm } from '@/components/categories/create-form';
import { CategoriesTable } from '@/components/categories/categories-table';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { parsePagination } from '@/lib/pagination';

export const metadata = { title: 'Categories' };

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CategoriesPage({ searchParams }: PageProps) {
  const actor = await requireRole(['Admin']).catch(() => notFound());

  if (!actor) notFound();

  const params = await searchParams;
  const { page, pageSize } = parsePagination(params);

  const [categoriesResult, siteCountMapResult] = await Promise.allSettled([
    fetchCategoriesPage(page, pageSize),
    fetchCategorySiteCountMap(),
  ]);

  const { rows: categories, total } =
    categoriesResult.status === 'fulfilled'
      ? categoriesResult.value
      : { rows: [], total: 0 };
  const siteCountMap = siteCountMapResult.status === 'fulfilled' ? siteCountMapResult.value : {};

  return (
    <div>
      <PageHeader title="Categories" description="Manage site categories" />
      <div className="space-y-4">
        <CreateCategoryForm />
        <CategoriesTable categories={categories} siteCountMap={siteCountMap} />
        <Pagination total={total} page={page} pageSize={pageSize} />
      </div>
    </div>
  );
}
