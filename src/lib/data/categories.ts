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
