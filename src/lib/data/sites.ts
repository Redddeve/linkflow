import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

type SiteStatus = Database['public']['Enums']['site_status'];

export interface SitesListFilters {
  sourcerId?: string;
  status?: SiteStatus;
  categoryId?: string;
  priceMinCents?: number;
  priceMaxCents?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

export type SitesListRow = {
  id: string;
  domain: string;
  status: SiteStatus;
  price_cents: number;
  link_type: Database['public']['Enums']['link_type'];
  category_id: string | null;
  created_at: string;
  dr: number | null;
  top_countries: string | null;
  countries: Database['public']['Enums']['country'][];
  languages: Database['public']['Enums']['language'][];
  categories: { name: string } | null;
};

export async function fetchSitesList(
  filters: SitesListFilters,
): Promise<{ rows: SitesListRow[]; total: number }> {
  const supabase = await createClient();
  let query = supabase
    .from('sites')
    .select(
      'id, domain, status, price_cents, link_type, category_id, created_at, dr, top_countries, countries, languages, categories(name)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (filters.sourcerId) query = query.eq('sourcer_id', filters.sourcerId);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.priceMinCents !== undefined) query = query.gte('price_cents', filters.priceMinCents);
  if (filters.priceMaxCents !== undefined) query = query.lte('price_cents', filters.priceMaxCents);
  if (filters.search) {
    const escaped = filters.search.replace(/[\\%_]/g, (m) => `\\${m}`);
    query = query.ilike('domain', `%${escaped}%`);
  }

  if (filters.page && filters.pageSize) {
    const offset = (filters.page - 1) * filters.pageSize;
    query = query.range(offset, offset + filters.pageSize - 1);
  }

  const { data, count } = await query;
  return { rows: (data ?? []) as SitesListRow[], total: count ?? 0 };
}

export async function fetchSiteById(id: string) {
  const supabase = await createClient();
  return supabase
    .from('sites')
    .select('*, categories(name)')
    .eq('id', id)
    .single();
}

export async function countSitesByStatusForSourcer(
  sourcerId: string,
  status: SiteStatus,
): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('sites')
    .select('*', { count: 'exact', head: true })
    .eq('sourcer_id', sourcerId)
    .eq('status', status);
  return count ?? 0;
}

export async function fetchSiteDomainsByIds(
  ids: string[],
): Promise<{ id: string; domain: string }[]> {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.from('sites').select('id, domain').in('id', ids);
  return data ?? [];
}

export async function countSitesByStatus(status: SiteStatus): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('sites')
    .select('*', { count: 'exact', head: true })
    .eq('status', status);
  return count ?? 0;
}
