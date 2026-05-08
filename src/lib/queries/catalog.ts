import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

type Country = Database['public']['Enums']['country'];
type Language = Database['public']['Enums']['language'];
type LinkType = Database['public']['Enums']['link_type'];

export interface CatalogFilters {
  search?: string;
  categoryId?: string;
  countries?: Country[];
  languages?: Language[];
  linkType?: LinkType;
  drMin?: number;
  drMax?: number;
  priceMin?: number;
  priceMax?: number;
  page?: number;
  pageSize?: number;
}

// Client-visible columns only — excludes sourcer_notes, contact_info, requirements, sourcer_id, sourcer_payout_cents
const CATALOG_SELECT =
  'id, domain, category_id, link_type, dr, organic_traffic_count, organic_keywords_count, countries, languages, description, keywords_relevance, top_countries, price_cents, status, categories(name)';

export interface CatalogSite {
  id: string;
  domain: string;
  category_id: string | null;
  link_type: LinkType;
  dr: number | null;
  organic_traffic_count: number;
  organic_keywords_count: number;
  countries: Country[];
  languages: Language[];
  description: string | null;
  keywords_relevance: string | null;
  top_countries: string | null;
  price_cents: number;
  status: Database['public']['Enums']['site_status'];
  categories: { name: string } | null;
  inMyCart: boolean;
}

export async function fetchActiveCatalog(
  filters: CatalogFilters,
  userId: string,
): Promise<{ sites: CatalogSite[]; total: number }> {
  const { page = 1, pageSize = 20 } = filters;
  const offset = (page - 1) * pageSize;

  const supabase = await createClient();

  let query = supabase
    .from('sites')
    .select(CATALOG_SELECT, { count: 'exact' })
    .eq('status', 'Active')
    .order('domain');

  if (filters.search) query = query.ilike('domain', `%${filters.search}%`);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.linkType) query = query.eq('link_type', filters.linkType);
  if (filters.drMin !== undefined) query = query.gte('dr', filters.drMin);
  if (filters.drMax !== undefined) query = query.lte('dr', filters.drMax);
  if (filters.priceMin !== undefined) query = query.gte('price_cents', filters.priceMin);
  if (filters.priceMax !== undefined) query = query.lte('price_cents', filters.priceMax);
  if (filters.countries?.length) query = query.overlaps('countries', filters.countries);
  if (filters.languages?.length) query = query.overlaps('languages', filters.languages);

  query = query.range(offset, offset + pageSize - 1);

  const [sitesResult, cartResult] = await Promise.all([
    query,
    supabase
      .from('cart_items')
      .select('site_id, carts!inner(created_by_id)')
      .eq('carts.created_by_id', userId),
  ]);

  const inCartIds = new Set(
    (cartResult.data ?? []).map((ci) => ci.site_id),
  );

  const sites: CatalogSite[] = (sitesResult.data ?? []).map((s) => ({
    ...s,
    inMyCart: inCartIds.has(s.id),
  })) as CatalogSite[];

  return { sites, total: sitesResult.count ?? 0 };
}
