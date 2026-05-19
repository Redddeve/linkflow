import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { fetchActiveCatalog, type CatalogFilters } from '@/lib/queries/catalog';
import { CatalogFiltersDrawer } from '@/components/catalog/catalog-filters-drawer';
import { CatalogTable } from '@/components/catalog/catalog-table';
import { PageHeader } from '@/components/ui/page-header';
import type { Database } from '@/types/database.types';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata = { title: 'Catalog' };

type LinkType = Database['public']['Enums']['link_type'];

export default async function CatalogPage({ searchParams }: PageProps) {
  const actor = await requireRole(['Client']).catch(() => notFound());

  const params = await searchParams;

  const filters: CatalogFilters = {
    search: typeof params.search === 'string' ? params.search : undefined,
    categoryId: typeof params.category === 'string' ? params.category : undefined,
    linkType: typeof params.link_type === 'string' ? (params.link_type as LinkType) : undefined,
    drMin: typeof params.dr_min === 'string' ? Number(params.dr_min) : undefined,
    drMax: typeof params.dr_max === 'string' ? Number(params.dr_max) : undefined,
    priceMin: typeof params.price_min === 'string' ? Number(params.price_min) * 100 : undefined,
    priceMax: typeof params.price_max === 'string' ? Number(params.price_max) * 100 : undefined,
    page: typeof params.page === 'string' ? Number(params.page) : 1,
    pageSize: 30,
  };

  const supabase = await createClient();
  const [{ sites, total }, { data: categories }] = await Promise.all([
    fetchActiveCatalog(filters, actor.id),
    supabase.from('categories').select('id, name').order('name'),
  ]);

  return (
    <div>
      <PageHeader
        title="Catalog"
        description={`${total} active site${total !== 1 ? 's' : ''} available`}
      />
      <div className="space-y-4">
        <CatalogFiltersDrawer categories={categories ?? []} />
        <CatalogTable sites={sites} />
      </div>
    </div>
  );
}
