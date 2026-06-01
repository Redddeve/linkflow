'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/features/auth';
import { recordAudit } from '@/lib/features/audit';
import { notify } from '@/lib/features/notify';
import { AppError, actionError, type ActionResult } from '@/lib/errors';
import {
  addCartItemSchema,
  removeCartItemSchema,
  updateCartItemSchema,
  type AddCartItemInput,
  type RemoveCartItemInput,
  type UpdateCartItemInput,
} from '@/lib/schemas/cart';
import type { Database } from '@/types/database.types';

type Country = Database['public']['Enums']['country'];
type Language = Database['public']['Enums']['language'];
type LinkType = Database['public']['Enums']['link_type'];

function mapForbidden(e: unknown): never {
  if (e instanceof Error && e.message.startsWith('FORBIDDEN')) {
    throw new AppError(
      'FORBIDDEN',
      'You do not have permission to perform this action',
    );
  }
  throw e;
}

async function getOrCreateCart(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from('carts')
    .select('id')
    .eq('created_by_id', userId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('carts')
    .insert({ created_by_id: userId })
    .select('id')
    .single();

  if (error || !created)
    throw new Error(error?.message ?? 'Failed to create cart');
  return created.id;
}

export async function addToCart(
  input: AddCartItemInput,
): Promise<ActionResult> {
  try {
    const actor = await requireRole(['Client']).catch(mapForbidden);

    const parsed = addCartItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        code: 'VALIDATION',
        message: parsed.error.issues[0].message,
      };
    }

    const supabase = await createClient();

    const { data: site } = await supabase
      .from('sites')
      .select('id, status')
      .eq('id', parsed.data.siteId)
      .maybeSingle();

    if (!site) {
      return { success: false, code: 'NOT_FOUND', message: 'Site not found' };
    }
    if (site.status !== 'Active') {
      return {
        success: false,
        code: 'VALIDATION',
        message: 'Site is not available',
      };
    }

    const { data: activeOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('created_by_id', actor.id)
      .eq('site_id', parsed.data.siteId)
      .not('status', 'in', '("Completed","Canceled")')
      .limit(1);

    if (activeOrders && activeOrders.length > 0) {
      return {
        success: false,
        code: 'CONFLICT',
        message: 'You already have an active order for this site',
      };
    }

    const cartId = await getOrCreateCart(supabase, actor.id);

    const { error } = await supabase
      .from('cart_items')
      .insert({
        cart_id: cartId,
        site_id: parsed.data.siteId,
        created_by_id: actor.id,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return {
          success: false,
          code: 'CONFLICT',
          message: 'Already in cart',
        };
      }
      return { success: false, code: 'UNKNOWN', message: error.message };
    }

    await recordAudit({
      entityType: 'site',
      entityId: parsed.data.siteId,
      action: 'cart.add_item',
      after: { cart_id: cartId },
    });

    revalidatePath('/dashboard/catalog');
    revalidatePath('/dashboard/cart');

    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function removeFromCart(
  input: RemoveCartItemInput,
): Promise<ActionResult> {
  try {
    const actor = await requireRole(['Client']).catch(mapForbidden);

    const parsed = removeCartItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        code: 'VALIDATION',
        message: parsed.error.issues[0].message,
      };
    }

    const supabase = await createClient();

    const { data: item } = await supabase
      .from('cart_items')
      .select('id, site_id, cart_id, carts!inner(created_by_id)')
      .eq('id', parsed.data.cartItemId)
      .maybeSingle();

    if (!item) {
      return {
        success: false,
        code: 'NOT_FOUND',
        message: 'Cart item not found',
      };
    }

    const cart = item.carts as { created_by_id: string } | null;
    if (!cart || cart.created_by_id !== actor.id) {
      return {
        success: false,
        code: 'FORBIDDEN',
        message: 'You do not have permission to remove this item',
      };
    }

    await recordAudit({
      entityType: 'site',
      entityId: item.site_id,
      action: 'cart.remove_item',
      before: { cart_id: item.cart_id },
    });

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', parsed.data.cartItemId);
    if (error) {
      return { success: false, code: 'UNKNOWN', message: error.message };
    }

    revalidatePath('/dashboard/cart');

    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function updateCartItem(
  input: UpdateCartItemInput,
): Promise<ActionResult> {
  try {
    const actor = await requireRole(['Client']).catch(mapForbidden);

    const parsed = updateCartItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        code: 'VALIDATION',
        message: parsed.error.issues[0].message,
      };
    }

    const supabase = await createClient();

    const { data: item } = await supabase
      .from('cart_items')
      .select('id, publish_date, cart_id, carts!inner(created_by_id)')
      .eq('id', parsed.data.cartItemId)
      .maybeSingle();

    if (!item) {
      return {
        success: false,
        code: 'NOT_FOUND',
        message: 'Cart item not found',
      };
    }

    const cart = item.carts as { created_by_id: string } | null;
    if (!cart || cart.created_by_id !== actor.id) {
      return {
        success: false,
        code: 'FORBIDDEN',
        message: 'You do not have permission to update this item',
      };
    }

    const newDate = parsed.data.publish_date.toISOString().split('T')[0];

    await recordAudit({
      entityType: 'site',
      entityId: item.cart_id,
      action: 'cart.update_item',
      before: { publish_date: item.publish_date },
      after: { publish_date: newDate },
    });

    const { error } = await supabase
      .from('cart_items')
      .update({ publish_date: newDate })
      .eq('id', parsed.data.cartItemId);

    if (error) {
      return { success: false, code: 'UNKNOWN', message: error.message };
    }

    revalidatePath('/dashboard/cart');

    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function checkoutCart(): Promise<ActionResult<{ orderIds: string[] }>> {
  try {
    const actor = await requireRole(['Client']).catch(mapForbidden);

    const supabase = await createClient();

    // Load cart with items and site snapshots
    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('created_by_id', actor.id)
      .maybeSingle();

    if (!cart) {
      return { success: false, code: 'VALIDATION', message: 'Cart is empty' };
    }

    const { data: items } = await supabase
      .from('cart_items')
      .select(
        `
        id,
        site_id,
        publish_date,
        sites!inner(
          id, domain, status, price_cents, link_type, dr,
          organic_traffic_count, organic_keywords_count,
          countries, languages, description, contact_info,
          requirements, keywords_relevance, top_countries, category_id
        )
      `,
      )
      .eq('cart_id', cart.id);

    if (!items || items.length === 0) {
      return { success: false, code: 'VALIDATION', message: 'Cart is empty' };
    }

    // Validate all items server-side
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const item of items) {
      const site = item.sites as Record<string, unknown>;
      if (site.status !== 'Active') {
        return {
          success: false,
          code: 'VALIDATION',
          message: `Site "${site.domain}" is no longer active`,
        };
      }
      if (!item.publish_date) {
        return {
          success: false,
          code: 'VALIDATION',
          message: `Publish date is required for "${site.domain}"`,
        };
      }
      if (new Date(item.publish_date) < today) {
        return {
          success: false,
          code: 'VALIDATION',
          message: `Publish date for "${site.domain}" is in the past`,
        };
      }
    }

    // Insert orders (one per cart item, snapshotting site fields)
    const orderInserts = items.map((item) => {
      const s = item.sites as {
        id: string;
        domain: string;
        status: string;
        price_cents: number;
        link_type: LinkType;
        dr: number | null;
        organic_traffic_count: number;
        organic_keywords_count: number;
        countries: Country[];
        languages: Language[];
        description: string | null;
        contact_info: string | null;
        requirements: string | null;
        keywords_relevance: string | null;
        top_countries: string | null;
        category_id: string | null;
      };
      return {
        created_by_id: actor.id,
        site_id: s.id,
        site_domain: s.domain,
        site_category_id: s.category_id,
        site_link_type: s.link_type,
        site_dr: s.dr,
        site_organic_traffic_count: s.organic_traffic_count,
        site_organic_keywords_count: s.organic_keywords_count,
        site_countries: s.countries,
        site_languages: s.languages,
        site_description: s.description,
        site_contact_info: s.contact_info,
        site_requirements: s.requirements,
        site_keywords_relevance: s.keywords_relevance,
        site_top_countries: s.top_countries,
        price_cents: s.price_cents,
        publish_date: item.publish_date!,
        status: 'New' as const,
      };
    });

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .insert(orderInserts)
      .select('id');

    if (ordersError || !orders) {
      return {
        success: false,
        code: 'UNKNOWN',
        message: ordersError?.message ?? 'Failed to create orders',
      };
    }

    // Clear cart items
    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id);

    if (deleteError) {
      return { success: false, code: 'UNKNOWN', message: deleteError.message };
    }

    const orderIds = orders.map((o) => o.id);

    // Audit each order
    await Promise.all(
      orderIds.map((id) =>
        recordAudit({
          entityType: 'order',
          entityId: id,
          action: 'order.create',
          after: { status: 'New', created_by_id: actor.id },
        }),
      ),
    );

    // Notify all active Managers
    const { data: managers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'Manager')
      .eq('status', 'ACTIVE');

    if (managers?.length) {
      await Promise.all(
        managers.map((m) =>
          notify({
            recipientId: m.id,
            type: 'order.created',
            payload: { orderIds, clientId: actor.id },
          }),
        ),
      );
    }

    revalidatePath('/dashboard/cart');
    revalidatePath('/dashboard/orders');

    return { success: true, data: { orderIds } };
  } catch (e) {
    return actionError(e);
  }
}
