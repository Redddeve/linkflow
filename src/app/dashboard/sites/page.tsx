import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SitesFilters } from './filters';
import { SitesTable } from './sites-table';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata = { title: 'Sites' };

export default async function SitesPage({ searchParams }: PageProps) {
  const actor = await requireRole(['Sourcer', 'Manager', 'Admin']).catch(() => notFound());

  const params = await searchParams;
  const status = typeof params?.status === 'string' ? params.status : undefined;
  const category = typeof params?.category === 'string' ? params.category : undefined;
  const priceMin = typeof params?.price_min === 'string' ? Number(params.price_min) * 100 : undefined;
  const priceMax = typeof params?.price_max === 'string' ? Number(params.price_max) * 100 : undefined;

  const supabase = await createClient();

  let query = supabase
    .from('sites')
    .select('id, domain, status, price_cents, link_type, category_id, created_at, categories(name)')
    .order('created_at', { ascending: false });

  if (actor.role === 'Sourcer') {
    query = query.eq('sourcer_id', actor.id);
  }

  if (status) query = query.eq('status', status as 'Pending' | 'Active' | 'Needs changes' | 'Archived');
  if (category) query = query.eq('category_id', category);
  if (priceMin !== undefined) query = query.gte('price_cents', priceMin);
  if (priceMax !== undefined) query = query.lte('price_cents', priceMax);

  const { data: sites } = await query;

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');

  const canCreate = ['Sourcer', 'Manager', 'Admin'].includes(actor.role ?? '');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {actor.role === 'Sourcer' ? 'My Sites' : 'Sites'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {actor.role === 'Sourcer' ? 'Sites you have submitted' : 'All sites in the platform'}
          </p>
        </div>
        {canCreate && (
          <Link href="/dashboard/sites/new" className={buttonVariants()}>Add site</Link>
        )}
      </div>
      <SitesFilters categories={categories ?? []} />
      <SitesTable sites={(sites ?? []) as Parameters<typeof SitesTable>[0]['sites']} actorRole={actor.role!} />
    </div>
  );
}
