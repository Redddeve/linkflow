'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/features/auth';
import { recordAudit } from '@/lib/features/audit';
import { notify } from '@/lib/features/notify';
import { AppError, actionError, type ActionResult } from '@/lib/errors';
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
): Promise<ActionResult<{ siteId: string }>> {
  try {
    const actor = await requireRole(['Sourcer']).catch(mapForbidden);

    const parsed = createSiteSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        code: 'VALIDATION',
        message: parsed.error.issues[0].message,
      };
    }

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('sites')
      .select('id')
      .eq('domain', parsed.data.domain)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        code: 'CONFLICT',
        message: 'A site with that domain already exists',
      };
    }

    const { data: site, error } = await supabase
      .from('sites')
      .insert({
        ...parsed.data,
        created_by_id: actor.id,
        sourcer_id: actor.id,
        status: 'Pending',
      })
      .select('id')
      .single();

    if (error || !site) {
      return {
        success: false,
        code: 'UNKNOWN',
        message: error?.message ?? 'Failed to create site',
      };
    }

    await recordAudit({
      entityType: 'site',
      entityId: site.id,
      action: 'site.create',
      after: { domain: parsed.data.domain, status: 'Pending' },
    });

    // §6.11: notify all admins that a new site has been submitted.
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'Admin')
      .eq('status', 'ACTIVE');

    if (admins) {
      await Promise.all(
        admins.map((a) =>
          notify({
            recipientId: a.id,
            type: 'site.created',
            payload: {
              site_id: site.id,
              domain: parsed.data.domain,
              submitted_by: actor.id,
            },
          }),
        ),
      );
    }

    return { success: true, data: { siteId: site.id } };
  } catch (e) {
    return actionError(e);
  }
}

export async function editSite(
  id: string,
  patch: EditSiteInput,
): Promise<ActionResult> {
  try {
    const actor = await requireRole(['Sourcer', 'Admin']).catch(mapForbidden);

    const parsed = editSiteSchema.safeParse(patch);
    if (!parsed.success) {
      return {
        success: false,
        code: 'VALIDATION',
        message: parsed.error.issues[0].message,
      };
    }

    const supabase = await createClient();

    const { data: current, error: fetchError } = await supabase
      .from('sites')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return { success: false, code: 'NOT_FOUND', message: 'Site not found' };
    }

    if (actor.role === 'Sourcer' && current.sourcer_id !== actor.id) {
      return {
        success: false,
        code: 'FORBIDDEN',
        message: 'You do not have permission to edit this site',
      };
    }

    if (parsed.data.domain && parsed.data.domain !== current.domain) {
      const { data: domainConflict } = await supabase
        .from('sites')
        .select('id')
        .eq('domain', parsed.data.domain)
        .neq('id', id)
        .maybeSingle();

      if (domainConflict) {
        return {
          success: false,
          code: 'CONFLICT',
          message: 'A site with that domain already exists',
        };
      }
    }

    const isOwner = actor.role === 'Sourcer' && current.sourcer_id === actor.id;
    const updatePayload = isOwner
      ? { ...parsed.data, status: 'Pending' as SiteStatus }
      : parsed.data;

    const { error: updateError } = await supabase
      .from('sites')
      .update(updatePayload)
      .eq('id', id);
    if (updateError) {
      return { success: false, code: 'UNKNOWN', message: updateError.message };
    }

    await recordAudit({
      entityType: 'site',
      entityId: id,
      action: 'site.edit',
      before: { domain: current.domain, status: current.status },
      after: updatePayload,
    });

    return { success: true };
  } catch (e) {
    return actionError(e);
  }
}

export async function setSiteStatus(
  id: string,
  action: SiteStatusAction,
): Promise<ActionResult> {
  try {
    const actor = await requireRole(['Admin']).catch(mapForbidden);

    const parsed = setSiteStatusSchema.safeParse({ action });
    if (!parsed.success) {
      return {
        success: false,
        code: 'VALIDATION',
        message: parsed.error.issues[0].message,
      };
    }

    const supabase = await createClient();

    const { data: site, error: fetchError } = await supabase
      .from('sites')
      .select('id, domain, status, sourcer_id, created_by_id')
      .eq('id', id)
      .single();

    if (fetchError || !site) {
      return { success: false, code: 'NOT_FOUND', message: 'Site not found' };
    }

    if (!VALID_TRANSITIONS[action].includes(site.status)) {
      return {
        success: false,
        code: 'CONFLICT',
        message: `Cannot ${action} a site with status "${site.status}"`,
      };
    }

    const now = new Date().toISOString();
    const updatePayload: TablesUpdate<'sites'> = {
      status: ACTION_RESULT_STATUS[action],
    };

    if (action === 'APPROVE') {
      updatePayload.approved_by_id = actor.id;
      updatePayload.approved_at = now;
    }

    const { error: updateError } = await supabase
      .from('sites')
      .update(updatePayload)
      .eq('id', id);
    if (updateError) {
      return { success: false, code: 'UNKNOWN', message: updateError.message };
    }

    await recordAudit({
      entityType: 'site',
      entityId: id,
      action: `site.${action.toLowerCase()}`,
      before: { status: site.status },
      after: { status: ACTION_RESULT_STATUS[action] },
    });

    // §6.11: notify the site owner (and the sourcer if different) that the
    // status has changed.
    const recipients = new Set<string>();
    if (site.sourcer_id) recipients.add(site.sourcer_id);
    if (site.created_by_id) recipients.add(site.created_by_id);
    recipients.delete(actor.id);

    await Promise.all(
      Array.from(recipients).map((recipientId) =>
        notify({
          recipientId,
          type: 'site.status_changed',
          payload: {
            site_id: id,
            domain: site.domain,
            from_status: site.status,
            to_status: ACTION_RESULT_STATUS[action],
          },
        }),
      ),
    );

    return { success: true };
  } catch (e) {
    return actionError(e);
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
