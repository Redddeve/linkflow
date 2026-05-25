import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { fetchActiveCatalog, type CatalogFilters } from '@/lib/data/catalog';
import { fetchCategories } from '@/lib/data/categories';
import { CatalogFiltersDrawer } from '@/components/catalog/catalog-filters-drawer';
import { CatalogTable } from '@/components/catalog/catalog-table';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { parsePagination } from '@/lib/pagination';
import type { Database } from '@/types/database.types';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata = { title: 'Catalog' };

type LinkType = Database['public']['Enums']['link_type'];

export default async function CatalogPage({ searchParams }: PageProps) {
  const actor = await requireRole(['Client']).catch(() => notFound());

  const params = await searchParams;
  const { page, pageSize } = parsePagination(params);

  const filters: CatalogFilters = {
    search: typeof params.search === 'string' ? params.search : undefined,
    categoryId: typeof params.category === 'string' ? params.category : undefined,
    linkType: typeof params.link_type === 'string' ? (params.link_type as LinkType) : undefined,
    drMin: typeof params.dr_min === 'string' ? Number(params.dr_min) : undefined,
    drMax: typeof params.dr_max === 'string' ? Number(params.dr_max) : undefined,
    priceMin: typeof params.price_min === 'string' ? Number(params.price_min) * 100 : undefined,
    priceMax: typeof params.price_max === 'string' ? Number(params.price_max) * 100 : undefined,
    page,
    pageSize,
  };

  const [{ sites, total }, categories] = await Promise.all([
    fetchActiveCatalog(filters, actor.id),
    fetchCategories(),
  ]);

  return (
    <div>
      <PageHeader
        title="Catalog"
        description={`${total} active site${total !== 1 ? 's' : ''} available`}
      />
      <div className="space-y-4">
        <CatalogFiltersDrawer categories={categories} />
        <CatalogTable sites={sites} />
        <Pagination total={total} page={page} pageSize={pageSize} />
      </div>
    </div>
  );
}
