'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/features/auth';
import { recordAudit } from '@/lib/features/audit';
import type { ActionResult } from '@/lib/errors';
import {
  createCategorySchema,
  editCategorySchema,
  type CreateCategoryInput,
  type EditCategoryInput,
} from '@/lib/schemas/categories';

function isForbidden(e: unknown): boolean {
  return e instanceof Error && e.message.startsWith('FORBIDDEN');
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<ActionResult<{ categoryId: string }>> {
  try {
    await requireRole(['Admin']);
  } catch (e) {
    if (isForbidden(e)) {
      return {
        success: false,
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action',
      };
    }
    throw e;
  }

  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: 'VALIDATION',
      message: parsed.error.issues[0].message,
    };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .ilike('name', parsed.data.name)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      code: 'CONFLICT',
      message: 'A category with that name already exists',
    };
  }

  const { data: actor } = await (await createClient()).auth.getClaims();
  const actorId = actor?.claims?.sub ?? '';

  const { data: category, error } = await supabase
    .from('categories')
    .insert({ name: parsed.data.name, created_by_id: actorId })
    .select('id')
    .single();

  if (error || !category) {
    return {
      success: false,
      code: 'UNKNOWN',
      message: error?.message ?? 'Failed to create category',
    };
  }

  await recordAudit({
    entityType: 'site',
    entityId: category.id,
    action: 'category.create',
    after: { name: parsed.data.name },
  });

  return { success: true, data: { categoryId: category.id } };
}

export async function editCategory(
  id: string,
  input: EditCategoryInput,
): Promise<ActionResult> {
  try {
    await requireRole(['Admin']);
  } catch (e) {
    if (isForbidden(e)) {
      return {
        success: false,
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action',
      };
    }
    throw e;
  }

  const parsed = editCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: 'VALIDATION',
      message: parsed.error.issues[0].message,
    };
  }

  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    return { success: false, code: 'NOT_FOUND', message: 'Category not found' };
  }

  if (parsed.data.name.toLowerCase() !== current.name.toLowerCase()) {
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', parsed.data.name)
      .neq('id', id)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        code: 'CONFLICT',
        message: 'A category with that name already exists',
      };
    }
  }

  const { error: updateError } = await supabase
    .from('categories')
    .update({ name: parsed.data.name })
    .eq('id', id);

  if (updateError) {
    return { success: false, code: 'UNKNOWN', message: updateError.message };
  }

  await recordAudit({
    entityType: 'site',
    entityId: id,
    action: 'category.edit',
    before: { name: current.name },
    after: { name: parsed.data.name },
  });

  return { success: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    await requireRole(['Admin']);
  } catch (e) {
    if (isForbidden(e)) {
      return {
        success: false,
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action',
      };
    }
    throw e;
  }

  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    return { success: false, code: 'NOT_FOUND', message: 'Category not found' };
  }

  const { count } = await supabase
    .from('sites')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id);

  if (count && count > 0) {
    return {
      success: false,
      code: 'CONFLICT',
      message: `Cannot delete: ${count} site${count === 1 ? '' : 's'} use this category`,
    };
  }

  const { error: deleteError } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return { success: false, code: 'UNKNOWN', message: deleteError.message };
  }

  await recordAudit({
    entityType: 'site',
    entityId: id,
    action: 'category.delete',
    before: { name: current.name },
    after: null,
  });

  return { success: true };
}
