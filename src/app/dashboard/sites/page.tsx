import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { requireRole } from '@/lib/features/auth';
import { SitesFilters } from '@/components/sites/sites-filters';
import { SitesTable } from '@/components/sites/sites-table';
import { Pagination } from '@/components/ui/pagination';
import { parsePagination } from '@/lib/features/pagination';
import { fetchSitesList } from '@/lib/data/sites';
import { fetchCategories } from '@/lib/data/categories';
import type { Database } from '@/types/database.types';

type SiteStatus = Database['public']['Enums']['site_status'];

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata = { title: 'Sites' };

export default async function SitesPage({ searchParams }: PageProps) {
  const actor = await requireRole(['Sourcer', 'Manager', 'Admin']).catch(() =>
    notFound(),
  );

  const params = await searchParams;
  const status =
    typeof params?.status === 'string'
      ? (params.status as SiteStatus)
      : undefined;
  const category =
    typeof params?.category === 'string' ? params.category : undefined;
  const priceMin =
    typeof params?.price_min === 'string'
      ? Number(params.price_min) * 100
      : undefined;
  const priceMax =
    typeof params?.price_max === 'string'
      ? Number(params.price_max) * 100
      : undefined;
  const search =
    typeof params?.search === 'string'
      ? params.search.trim() || undefined
      : undefined;
  const { page, pageSize } = parsePagination(params);

  const [{ rows: sites, total }, categories] = await Promise.all([
    fetchSitesList({
      sourcerId: actor.role === 'Sourcer' ? actor.id : undefined,
      status,
      categoryId: category,
      priceMinCents: priceMin,
      priceMaxCents: priceMax,
      search,
      page,
      pageSize,
    }),
    fetchCategories(),
  ]);

  const canCreate = actor.role === 'Sourcer';

  return (
    <div>
      <PageHeader
        title={actor.role === 'Sourcer' ? 'My Sites' : 'Sites'}
        description={
          actor.role === 'Sourcer'
            ? 'Sites you have submitted'
            : 'All sites in the platform'
        }
        actions={
          canCreate && (
            <Link href="/dashboard/sites/new" className={buttonVariants()}>
              Add site
            </Link>
          )
        }
      />
      <div className="space-y-4">
        <SitesFilters categories={categories} />
        <SitesTable
          sites={sites as Parameters<typeof SitesTable>[0]['sites']}
        />
        <Pagination total={total} page={page} pageSize={pageSize} />
      </div>
    </div>
  );
}
