'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/features/auth';
import { recordAudit } from '@/lib/features/audit';
import { EMAIL_TEMPLATES, getMailer } from '@/lib/features/email';
import type { ActionResult, ErrorCode } from '@/lib/errors';
import { canManageTargetRole, canReassignClientManager } from '@/lib/rbac';
import { getAppUrl } from '@/lib/utils';
import {
  inviteUserSchema,
  editUserSchema,
  disableUserSchema,
  type InviteUserInput,
  type EditUserInput,
} from '@/lib/schemas/users';
import type { UserRole, UserRow } from '@/lib/features/auth';

export type BlockingOrder = {
  id: string;
  status: string;
  site_domain: string;
};

export type DisableResult =
  | { ok: true }
  | { ok: false; code: 'FORBIDDEN_SELF' }
  | { ok: false; code: 'BLOCKING_ORDERS'; orders: BlockingOrder[] }
  | {
      ok: false;
      code: 'VALIDATION' | 'NOT_FOUND' | 'FORBIDDEN' | 'UNKNOWN';
      message: string;
    };

export type EditUserResult =
  | {
      success: true;
      requiresConfirm?: { activeOrders: number; activeSites: number };
    }
  | { success: false; code: ErrorCode | 'UNKNOWN'; message: string };

/**
 * Run requireRole and translate a "FORBIDDEN: ..." error from auth into a
 * structured ActionResult-shaped failure. Returns a tuple [actor, error].
 * Re-throws anything that is NOT a forbidden error since those represent
 * genuine programming/infra failures.
 */
async function requireRoleOrError(
  roles: UserRole[],
): Promise<
  | { ok: true; actor: UserRow }
  | { ok: false; error: { code: 'FORBIDDEN'; message: string } }
> {
  try {
    const actor = await requireRole(roles);
    return { ok: true, actor };
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('FORBIDDEN')) {
      return {
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action',
        },
      };
    }
    throw e;
  }
}

export async function inviteUser(
  input: InviteUserInput,
): Promise<ActionResult<{ userId: string }>> {
  const auth = await requireRoleOrError(['Admin', 'Manager']);
  if (!auth.ok)
    return { success: false, code: auth.error.code, message: auth.error.message };
  const actor = auth.actor;

  const parsed = inviteUserSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      code: 'VALIDATION',
      message: parsed.error.issues[0].message,
    };

  const { email, first_name, last_name, role } = parsed.data;

  if (actor.role && !canManageTargetRole(actor.role, role)) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'You do not have permission to invite this role',
    };
  }

  // For Clients invited by a Manager, default to self if no explicit pick
  const manager_id =
    role === 'Client' && actor.role === 'Manager'
      ? (parsed.data.manager_id ?? actor.id)
      : (parsed.data.manager_id ?? null);

  // Email uniqueness check across all statuses (PRD §1282)
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('users')
    .select('id, status')
    .ilike('email', email)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      code: 'EMAIL_EXISTS',
      message: `A user with that email already exists (${existing.status})`,
    };
  }

  const admin = createAdminClient();
  const redirectTo = `${getAppUrl()}/auth/confirm?next=/auth/set-password`;
  const { data: authData, error: authError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: { role, manager_id, first_name, last_name },
      redirectTo,
    });

  if (authError || !authData.user) {
    console.error('[inviteUser] Auth error:', authError);
    return {
      success: false,
      code: 'INVITE_FAILED',
      message: authError?.message ?? 'Failed to send invitation',
    };
  }

  const userId = authData.user.id;

  // Set invited_at and created_by_id on the users row created by the trigger
  await supabase
    .from('users')
    .update({ invited_at: new Date().toISOString(), created_by_id: actor.id })
    .eq('id', userId);

  await recordAudit({
    entityType: 'user',
    entityId: userId,
    action: 'user.invite',
    after: { email, role, manager_id },
  });

  return { success: true, data: { userId } };
}

export async function resendInvite(userId: string): Promise<ActionResult> {
  const auth = await requireRoleOrError(['Admin', 'Manager']);
  if (!auth.ok)
    return { success: false, code: auth.error.code, message: auth.error.message };
  const actor = auth.actor;

  const supabase = await createClient();
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, status, role, first_name, last_name, manager_id')
    .eq('id', userId)
    .single();

  if (error || !user)
    return { success: false, code: 'NOT_FOUND', message: 'User not found' };
  if (actor.role && !canManageTargetRole(actor.role, user.role)) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'You do not have permission to resend this invitation',
    };
  }
  if (user.status !== 'PENDING')
    return {
      success: false,
      code: 'VALIDATION',
      message: 'User is not in PENDING status',
    };

  const admin = createAdminClient();
  const redirectTo = `${getAppUrl()}/auth/confirm?next=/auth/set-password`;

  // First try: re-send the native Supabase invite email. This is what
  // actually delivers an inbox message in 99% of cases.
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    user.email,
    {
      data: {
        role: user.role,
        manager_id: user.manager_id,
        first_name: user.first_name,
        last_name: user.last_name,
        resent: true,
      },
      redirectTo,
    },
  );

  // Fallback: if the auth row already exists, inviteUserByEmail returns
  // an error. Generate a link manually and ship it via the transactional
  // mailer (Brevo) so the user still receives an email.
  if (inviteError) {
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: 'invite',
        email: user.email,
        options: { redirectTo },
      });

    if (linkError)
      return { success: false, code: 'UNKNOWN', message: linkError.message };

    const inviteLink = linkData?.properties?.action_link;
    if (inviteLink) {
      const tpl = EMAIL_TEMPLATES['user.invite_resent'];
      await getMailer().send({
        to: user.email,
        templateId: tpl.templateId,
        params: tpl.buildParams({
          first_name: user.first_name,
          invite_link: inviteLink,
        }),
      });
    }
  }

  await supabase
    .from('users')
    .update({ invited_at: new Date().toISOString() })
    .eq('id', userId);

  await recordAudit({
    entityType: 'user',
    entityId: userId,
    action: 'user.invite_resent',
  });

  return { success: true };
}

export async function editUser(
  userId: string,
  patch: EditUserInput,
  opts: { confirmRoleChange?: boolean } = {},
): Promise<EditUserResult> {
  const auth = await requireRoleOrError(['Admin', 'Manager']);
  if (!auth.ok)
    return { success: false, code: auth.error.code, message: auth.error.message };
  const actor = auth.actor;

  const parsed = editUserSchema.safeParse(patch);
  if (!parsed.success)
    return {
      success: false,
      code: 'VALIDATION',
      message: parsed.error.issues[0].message,
    };

  const supabase = await createClient();
  const { data: current, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !current)
    return { success: false, code: 'NOT_FOUND', message: 'User not found' };

  if (actor.role && !canManageTargetRole(actor.role, current.role)) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'You do not have permission to edit this user',
    };
  }

  if (actor.role === 'Manager' && parsed.data.role !== undefined) {
    return {
      success: false,
      code: 'VALIDATION',
      message: 'Managers cannot change a user role',
    };
  }

  // manager_id reassignment: Admin can set any Client's manager;
  // a Manager may only reassign Clients they currently manage.
  if (
    parsed.data.manager_id !== undefined &&
    parsed.data.manager_id !== current.manager_id
  ) {
    const allowed =
      actor.role &&
      canReassignClientManager({
        actorRole: actor.role,
        actorId: actor.id,
        targetRole: current.role,
        targetManagerId: current.manager_id,
      });
    if (!allowed) {
      return {
        success: false,
        code: 'FORBIDDEN',
        message:
          'You do not have permission to reassign this user to another manager',
      };
    }
  }

  // If changing role, check for active dependencies
  if (
    parsed.data.role &&
    parsed.data.role !== current.role &&
    !opts.confirmRoleChange
  ) {
    const [ordersResult, sitesResult] = await Promise.all([
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('copywriter_id', userId)
        .in('status', ['In Progress', 'Needs changes']),
      supabase
        .from('sites')
        .select('id', { count: 'exact', head: true })
        .eq('sourcer_id', userId)
        .in('status', ['Pending', 'Active']),
    ]);

    const activeOrders = ordersResult.count ?? 0;
    const activeSites = sitesResult.count ?? 0;

    if (activeOrders > 0 || activeSites > 0) {
      return {
        success: true,
        requiresConfirm: { activeOrders, activeSites },
      };
    }
  }

  const { error: updateError } = await supabase
    .from('users')
    .update(parsed.data)
    .eq('id', userId);

  if (updateError)
    return { success: false, code: 'UNKNOWN', message: updateError.message };

  await recordAudit({
    entityType: 'user',
    entityId: userId,
    action: 'user.edit',
    before: { role: current.role, manager_id: current.manager_id },
    after: parsed.data,
  });

  return { success: true };
}

export async function disableUser(
  userId: string,
  reason: string,
): Promise<DisableResult> {
  const auth = await requireRoleOrError(['Admin']);
  if (!auth.ok)
    return { ok: false, code: auth.error.code, message: auth.error.message };
  const actor = auth.actor;

  const parsed = disableUserSchema.safeParse({ reason });
  if (!parsed.success)
    return {
      ok: false,
      code: 'VALIDATION',
      message: parsed.error.issues[0].message,
    };

  // Cannot disable yourself
  if (actor.id === userId) {
    return { ok: false, code: 'FORBIDDEN_SELF' };
  }

  const supabase = await createClient();
  const { data: target, error } = await supabase
    .from('users')
    .select('id, role, status')
    .eq('id', userId)
    .single();

  if (error || !target)
    return { ok: false, code: 'NOT_FOUND', message: 'User not found' };

  // Copywriter with active orders: return blocking list
  if (target.role === 'Copywriter') {
    const { data: blockingOrders } = await supabase
      .from('orders')
      .select('id, status, site_domain')
      .eq('copywriter_id', userId)
      .in('status', ['In Progress', 'Needs changes']);

    if (blockingOrders && blockingOrders.length > 0) {
      return {
        ok: false,
        code: 'BLOCKING_ORDERS',
        orders: blockingOrders.map((o) => ({
          id: o.id,
          status: o.status,
          site_domain: o.site_domain,
        })),
      };
    }
  }

  // Sourcer: atomic disable via RPC (archives sites, clears sourcer_id)
  if (target.role === 'Sourcer') {
    const { error: rpcError } = await supabase.rpc('disable_sourcer', {
      p_user_id: userId,
      p_reason: parsed.data.reason,
    });
    if (rpcError)
      return { ok: false, code: 'UNKNOWN', message: rpcError.message };
  } else {
    const { error: updateError } = await supabase
      .from('users')
      .update({ status: 'DISABLED', disabled_reason: parsed.data.reason })
      .eq('id', userId);
    if (updateError)
      return { ok: false, code: 'UNKNOWN', message: updateError.message };
  }

  await recordAudit({
    entityType: 'user',
    entityId: userId,
    action: 'user.disable',
    before: { status: target.status },
    after: { status: 'DISABLED', disabled_reason: parsed.data.reason },
  });

  return { ok: true };
}

export async function activateUser(userId: string): Promise<ActionResult> {
  const auth = await requireRoleOrError(['Admin']);
  if (!auth.ok)
    return { success: false, code: auth.error.code, message: auth.error.message };

  const supabase = await createClient();
  const { data: target, error } = await supabase
    .from('users')
    .select('id, status')
    .eq('id', userId)
    .single();

  if (error || !target)
    return { success: false, code: 'NOT_FOUND', message: 'User not found' };

  const { error: updateError } = await supabase
    .from('users')
    .update({ status: 'ACTIVE', disabled_reason: null })
    .eq('id', userId);

  if (updateError)
    return { success: false, code: 'UNKNOWN', message: updateError.message };

  await recordAudit({
    entityType: 'user',
    entityId: userId,
    action: 'user.activate',
    before: { status: target.status },
    after: { status: 'ACTIVE' },
  });

  return { success: true };
}

export async function listManagers(): Promise<
  ActionResult<{ id: string; first_name: string; last_name: string }[]>
> {
  const auth = await requireRoleOrError(['Admin', 'Manager']);
  if (!auth.ok)
    return { success: false, code: auth.error.code, message: auth.error.message };

  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('role', 'Manager' as UserRole)
    .in('status', ['ACTIVE', 'PENDING'])
    .order('first_name');
  return { success: true, data: data ?? [] };
}
