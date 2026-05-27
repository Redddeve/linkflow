'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/features/auth';
import { recordAudit } from '@/lib/features/audit';
import { AppError } from '@/lib/errors';
import {
  createCategorySchema,
  editCategorySchema,
  type CreateCategoryInput,
  type EditCategoryInput,
} from '@/lib/schemas/categories';

function mapForbidden(e: unknown): never {
  if (e instanceof Error && e.message.startsWith('FORBIDDEN')) {
    throw new AppError(
      'FORBIDDEN',
      'You do not have permission to perform this action',
    );
  }
  throw e;
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<{ categoryId: string }> {
  await requireRole(['Admin']).catch(mapForbidden);

  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success)
    throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .ilike('name', parsed.data.name)
    .maybeSingle();

  if (existing)
    throw new AppError('CONFLICT', 'A category with that name already exists');

  const { data: actor } = await (await createClient()).auth.getClaims();
  const actorId = actor?.claims?.sub ?? '';

  const { data: category, error } = await supabase
    .from('categories')
    .insert({ name: parsed.data.name, created_by_id: actorId })
    .select('id')
    .single();

  if (error || !category)
    throw new Error(error?.message ?? 'Failed to create category');

  await recordAudit({
    entityType: 'site',
    entityId: category.id,
    action: 'category.create',
    after: { name: parsed.data.name },
  });

  return { categoryId: category.id };
}

export async function editCategory(
  id: string,
  input: EditCategoryInput,
): Promise<void> {
  await requireRole(['Admin']).catch(mapForbidden);

  const parsed = editCategorySchema.safeParse(input);
  if (!parsed.success)
    throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('id', id)
    .single();

  if (fetchError || !current)
    throw new AppError('NOT_FOUND', 'Category not found');

  if (parsed.data.name.toLowerCase() !== current.name.toLowerCase()) {
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', parsed.data.name)
      .neq('id', id)
      .maybeSingle();

    if (existing)
      throw new AppError(
        'CONFLICT',
        'A category with that name already exists',
      );
  }

  const { error: updateError } = await supabase
    .from('categories')
    .update({ name: parsed.data.name })
    .eq('id', id);

  if (updateError) throw new Error(updateError.message);

  await recordAudit({
    entityType: 'site',
    entityId: id,
    action: 'category.edit',
    before: { name: current.name },
    after: { name: parsed.data.name },
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await requireRole(['Admin']).catch(mapForbidden);

  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('id', id)
    .single();

  if (fetchError || !current)
    throw new AppError('NOT_FOUND', 'Category not found');

  const { count } = await supabase
    .from('sites')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id);

  if (count && count > 0)
    throw new AppError(
      'CONFLICT',
      `Cannot delete: ${count} site${count === 1 ? '' : 's'} use this category`,
    );

  const { error: deleteError } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (deleteError) throw new Error(deleteError.message);

  await recordAudit({
    entityType: 'site',
    entityId: id,
    action: 'category.delete',
    before: { name: current.name },
    after: null,
  });
}
