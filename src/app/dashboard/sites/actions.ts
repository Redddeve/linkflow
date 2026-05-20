'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { notify } from '@/lib/notify';
import { AppError } from '@/lib/errors';
import {
  createSiteSchema,
  editSiteSchema,
  setSiteStatusSchema,
  VALID_TRANSITIONS,
  type CreateSiteInput,
  type EditSiteInput,
  type SiteStatusAction,
  type SiteStatus,
} from '@/lib/schemas/sites';
import type { TablesUpdate } from '@/types/database.types';

const ACTION_RESULT_STATUS: Record<SiteStatusAction, SiteStatus> = {
  APPROVE: 'Active',
  NEEDS_CHANGES: 'Needs changes',
  ARCHIVE: 'Archived',
  REACTIVATE: 'Active',
};

function mapForbidden(e: unknown): never {
  if (e instanceof Error && e.message.startsWith('FORBIDDEN')) {
    throw new AppError(
      'FORBIDDEN',
      'You do not have permission to perform this action',
    );
  }
  throw e;
}

export async function createSite(
  input: CreateSiteInput,
): Promise<{ siteId: string }> {
  const actor = await requireRole(['Sourcer', 'Manager', 'Admin']).catch(
    mapForbidden,
  );

  const parsed = createSiteSchema.safeParse(input);
  if (!parsed.success)
    throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('sites')
    .select('id')
    .eq('domain', parsed.data.domain)
    .maybeSingle();

  if (existing)
    throw new AppError('CONFLICT', 'A site with that domain already exists');

  const { data: site, error } = await supabase
    .from('sites')
    .insert({
      ...parsed.data,
      created_by_id: actor.id,
      sourcer_id: actor.role === 'Sourcer' ? actor.id : null,
      status: 'Pending',
    })
    .select('id')
    .single();

  if (error || !site)
    throw new Error(error?.message ?? 'Failed to create site');

  await recordAudit({
    entityType: 'site',
    entityId: site.id,
    action: 'site.create',
    after: { domain: parsed.data.domain, status: 'Pending' },
  });

  return { siteId: site.id };
}

export async function editSite(
  id: string,
  patch: EditSiteInput,
): Promise<void> {
  const actor = await requireRole(['Sourcer', 'Manager', 'Admin']).catch(
    mapForbidden,
  );

  const parsed = editSiteSchema.safeParse(patch);
  if (!parsed.success)
    throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from('sites')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !current) throw new AppError('NOT_FOUND', 'Site not found');

  if (actor.role === 'Sourcer' && current.sourcer_id !== actor.id) {
    throw new AppError(
      'FORBIDDEN',
      'You do not have permission to edit this site',
    );
  }

  if (parsed.data.domain && parsed.data.domain !== current.domain) {
    const { data: domainConflict } = await supabase
      .from('sites')
      .select('id')
      .eq('domain', parsed.data.domain)
      .neq('id', id)
      .maybeSingle();

    if (domainConflict)
      throw new AppError('CONFLICT', 'A site with that domain already exists');
  }

  const isOwner = actor.role === 'Sourcer' && current.sourcer_id === actor.id;
  const updatePayload = isOwner
    ? { ...parsed.data, status: 'Pending' as SiteStatus }
    : parsed.data;

  const { error: updateError } = await supabase
    .from('sites')
    .update(updatePayload)
    .eq('id', id);
  if (updateError) throw new Error(updateError.message);

  await recordAudit({
    entityType: 'site',
    entityId: id,
    action: 'site.edit',
    before: { domain: current.domain, status: current.status },
    after: updatePayload,
  });
}

export async function setSiteStatus(
  id: string,
  action: SiteStatusAction,
  change_note?: string,
): Promise<void> {
  const actor = await requireRole(['Admin']).catch(mapForbidden);

  const parsed = setSiteStatusSchema.safeParse({ action, change_note });
  if (!parsed.success)
    throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const supabase = await createClient();

  const { data: site, error: fetchError } = await supabase
    .from('sites')
    .select('id, domain, status, sourcer_id')
    .eq('id', id)
    .single();

  if (fetchError || !site) throw new AppError('NOT_FOUND', 'Site not found');

  if (!VALID_TRANSITIONS[action].includes(site.status)) {
    throw new AppError(
      'CONFLICT',
      `Cannot ${action} a site with status "${site.status}"`,
    );
  }

  const now = new Date().toISOString();
  const updatePayload: TablesUpdate<'sites'> = {
    status: ACTION_RESULT_STATUS[action],
  };

  if (action === 'APPROVE') {
    updatePayload.approved_by_id = actor.id;
    updatePayload.approved_at = now;
  } else if (action === 'NEEDS_CHANGES') {
    updatePayload.needs_changes_by_id = actor.id;
    updatePayload.needs_changes_at = now;
  }

  const { error: updateError } = await supabase
    .from('sites')
    .update(updatePayload)
    .eq('id', id);
  if (updateError) throw new Error(updateError.message);

  await recordAudit({
    entityType: 'site',
    entityId: id,
    action: `site.${action.toLowerCase()}`,
    before: { status: site.status },
    after: {
      status: ACTION_RESULT_STATUS[action],
      change_note: change_note ?? null,
    },
  });

  if (site.sourcer_id) {
    await notify({
      recipientId: site.sourcer_id,
      type: `site.${action.toLowerCase()}`,
      payload: {
        site_id: id,
        domain: site.domain,
        change_note: change_note ?? null,
      },
    });
  }
}

export async function listCategories(): Promise<
  { id: string; name: string }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');
  return data ?? [];
}
