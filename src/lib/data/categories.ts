import { createClient } from '@/lib/supabase/server';

export interface Category {
  id: string;
  name: string;
}

export async function fetchCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');
  return data ?? [];
}

export async function fetchCategoriesPage(
  page: number,
  pageSize: number,
): Promise<{ rows: Category[]; total: number }> {
  const supabase = await createClient();
  const offset = (page - 1) * pageSize;
  const { data, count } = await supabase
    .from('categories')
    .select('id, name', { count: 'exact' })
    .order('name')
    .range(offset, offset + pageSize - 1);
  return { rows: data ?? [], total: count ?? 0 };
}

export async function fetchCategorySiteCountMap(): Promise<
  Record<string, number>
> {
  const supabase = await createClient();
  const { data } = await supabase.from('categories').select('id, sites(count)');

  const map: Record<string, number> = {};
  for (const row of (data ?? []) as {
    id: string;
    sites: { count: number }[];
  }[]) {
    map[row.id] = row.sites[0]?.count ?? 0;
  }
  return map;
}
