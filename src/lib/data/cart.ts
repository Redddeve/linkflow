import { createClient } from '@/lib/supabase/server';

export type CartItemRow = {
  id: string;
  site_id: string;
  publish_date: string | null;
  sites: {
    domain: string;
    status: string;
    price_cents: number;
    link_type: string;
  };
};

export async function fetchClientCart(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('carts')
    .select('id')
    .eq('created_by_id', clientId)
    .maybeSingle();
  return data;
}

export async function fetchCartItems(cartId: string): Promise<CartItemRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('cart_items')
    .select(
      'id, site_id, publish_date, sites!inner(domain, status, price_cents, link_type)',
    )
    .eq('cart_id', cartId)
    .order('created_at');
  return (data ?? []) as CartItemRow[];
}

export async function fetchCartItemsWithPrice(
  cartId: string,
): Promise<{ id: string; sites: { price_cents: number } }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('cart_items')
    .select('id, sites!inner(price_cents)')
    .eq('cart_id', cartId);
  return (data ?? []) as { id: string; sites: { price_cents: number } }[];
}
