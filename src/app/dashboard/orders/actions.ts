'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { notify } from '@/lib/notify';
import { AppError } from '@/lib/errors';
import { firstOfMonth } from '@/lib/billing';
import {
  editOrderPublishDateSchema,
  cancelOrderSchema,
  assignCopywriterSchema,
  saveOrderContentSchema,
  submitOrderContentSchema,
  approveOrderSchema,
  rejectOrderSchema,
  addCommentSchema,
  publishOrderSchema,
  type EditOrderPublishDateInput,
  type CancelOrderInput,
  type AssignCopywriterInput,
  type SaveOrderContentInput,
  type SubmitOrderContentInput,
  type ApproveOrderInput,
  type RejectOrderInput,
  type AddCommentInput,
  type PublishOrderInput,
} from '@/lib/schemas/orders';
import type { Database } from '@/types/database.types';

type OrderStatus = Database['public']['Enums']['order_status'];

// Valid source statuses for each mutation — enforced both in app and via optimistic guard
const TRANSITION_GUARDS = {
  editPublishDate: ['New'] as OrderStatus[],
  cancel: ['New'] as OrderStatus[],
  assign: ['New'] as OrderStatus[],
  reassign: ['In Progress', 'Needs changes'] as OrderStatus[],
  saveContent: ['In Progress', 'Needs changes'] as OrderStatus[],
  submitContent: ['In Progress', 'Needs changes'] as OrderStatus[],
  approve: ['Content Sent'] as OrderStatus[],
  reject: ['Content Sent'] as OrderStatus[],
  publish: ['Content Approved'] as OrderStatus[],
} as const;

function mapForbidden(e: unknown): never {
  if (e instanceof Error && e.message.startsWith('FORBIDDEN')) {
    throw new AppError('FORBIDDEN', 'You do not have permission to perform this action');
  }
  throw e;
}

export async function editOrderPublishDate(input: EditOrderPublishDateInput): Promise<void> {
  const actor = await requireRole(['Client']).catch(mapForbidden);

  const parsed = editOrderPublishDateSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const { orderId, publish_date } = parsed.data;

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, created_by_id, manager_id')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new AppError('NOT_FOUND', 'Order not found');
  if (order.created_by_id !== actor.id) throw new AppError('FORBIDDEN', 'You do not own this order');
  if (!TRANSITION_GUARDS.editPublishDate.includes(order.status)) {
    throw new AppError('VALIDATION', `Cannot edit publish date on an order with status "${order.status}"`);
  }

  const dateStr = publish_date.toISOString().split('T')[0];
  const { error: updateError } = await supabase
    .from('orders')
    .update({ publish_date: dateStr })
    .eq('id', orderId)
    .eq('status', 'New');

  if (updateError) throw new Error(updateError.message);

  await recordAudit({
    entityType: 'order',
    entityId: orderId,
    action: 'order.publish_date_changed',
    before: { publish_date: order },
    after: { publish_date: dateStr },
  });

  if (order.manager_id) {
    await notify({
      recipientId: order.manager_id,
      type: 'order.publish_date_changed',
      payload: { orderId, publish_date: dateStr },
    });
  }

  revalidatePath('/dashboard/orders');
  revalidatePath(`/dashboard/orders/${orderId}`);
}

export async function cancelOrder(input: CancelOrderInput): Promise<void> {
  const actor = await requireRole(['Client']).catch(mapForbidden);

  const parsed = cancelOrderSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const { orderId, reason } = parsed.data;

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, created_by_id, manager_id')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new AppError('NOT_FOUND', 'Order not found');
  if (order.created_by_id !== actor.id) throw new AppError('FORBIDDEN', 'You do not own this order');
  if (!TRANSITION_GUARDS.cancel.includes(order.status)) {
    throw new AppError('VALIDATION', `Cannot cancel an order with status "${order.status}"`);
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'Canceled',
      canceled_at: new Date().toISOString(),
      cancellation_reason: reason ?? null,
    })
    .eq('id', orderId)
    .eq('status', 'New');

  if (updateError) throw new Error(updateError.message);

  await recordAudit({
    entityType: 'order',
    entityId: orderId,
    action: 'order.cancel',
    before: { status: order.status },
    after: { status: 'Canceled', cancellation_reason: reason ?? null },
  });

  if (order.manager_id) {
    await notify({
      recipientId: order.manager_id,
      type: 'order.canceled',
      payload: { orderId, reason: reason ?? null },
    });
  } else {
    // Notify all active managers if none assigned yet
    const { data: managers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'Manager')
      .eq('status', 'ACTIVE');
    if (managers?.length) {
      await Promise.all(
        managers.map((m) =>
          notify({ recipientId: m.id, type: 'order.canceled', payload: { orderId, reason: reason ?? null } }),
        ),
      );
    }
  }

  revalidatePath('/dashboard/orders');
  revalidatePath(`/dashboard/orders/${orderId}`);
}

export async function assignCopywriter(input: AssignCopywriterInput): Promise<void> {
  const actor = await requireRole(['Manager', 'Admin']).catch(mapForbidden);

  const parsed = assignCopywriterSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const { orderId, copywriterId } = parsed.data;

  const supabase = await createClient();

  const [orderResult, copywriterResult] = await Promise.all([
    supabase.from('orders').select('id, status, created_by_id, manager_id').eq('id', orderId).single(),
    supabase.from('users').select('id, role, status').eq('id', copywriterId).single(),
  ]);

  if (orderResult.error || !orderResult.data) throw new AppError('NOT_FOUND', 'Order not found');
  if (copywriterResult.error || !copywriterResult.data) throw new AppError('NOT_FOUND', 'Copywriter not found');

  const order = orderResult.data;
  const copywriter = copywriterResult.data;

  if (!TRANSITION_GUARDS.assign.includes(order.status)) {
    throw new AppError('VALIDATION', `Cannot assign copywriter to an order with status "${order.status}"`);
  }
  if (copywriter.role !== 'Copywriter') {
    throw new AppError('VALIDATION', 'Target user is not a Copywriter');
  }
  if (copywriter.status !== 'ACTIVE') {
    throw new AppError('VALIDATION', 'Copywriter is not active');
  }

  const newManagerId = order.manager_id ?? actor.id;

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'In Progress', copywriter_id: copywriterId, manager_id: newManagerId })
    .eq('id', orderId)
    .eq('status', 'New');

  if (updateError) throw new Error(updateError.message);

  await recordAudit({
    entityType: 'order',
    entityId: orderId,
    action: 'order.assign',
    before: { status: order.status, copywriter_id: null },
    after: { status: 'In Progress', copywriter_id: copywriterId, manager_id: newManagerId },
  });

  await Promise.all([
    notify({ recipientId: copywriterId, type: 'order.assigned', payload: { orderId } }),
    notify({ recipientId: order.created_by_id, type: 'order.in_progress', payload: { orderId } }),
  ]);

  revalidatePath('/dashboard/orders');
  revalidatePath(`/dashboard/orders/${orderId}`);
}

export async function reassignCopywriter(input: AssignCopywriterInput): Promise<void> {
  await requireRole(['Manager', 'Admin']).catch(mapForbidden);

  const parsed = assignCopywriterSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const { orderId, copywriterId } = parsed.data;

  const supabase = await createClient();

  const [orderResult, copywriterResult] = await Promise.all([
    supabase.from('orders').select('id, status, copywriter_id, created_by_id').eq('id', orderId).single(),
    supabase.from('users').select('id, role, status').eq('id', copywriterId).single(),
  ]);

  if (orderResult.error || !orderResult.data) throw new AppError('NOT_FOUND', 'Order not found');
  if (copywriterResult.error || !copywriterResult.data) throw new AppError('NOT_FOUND', 'Copywriter not found');

  const order = orderResult.data;
  const copywriter = copywriterResult.data;

  if (!TRANSITION_GUARDS.reassign.includes(order.status)) {
    throw new AppError('VALIDATION', `Cannot reassign copywriter on an order with status "${order.status}"`);
  }
  if (copywriter.role !== 'Copywriter') {
    throw new AppError('VALIDATION', 'Target user is not a Copywriter');
  }
  if (copywriter.status !== 'ACTIVE') {
    throw new AppError('VALIDATION', 'Copywriter is not active');
  }

  const previousCopywriterId = order.copywriter_id;

  const { error: updateError } = await supabase
    .from('orders')
    .update({ copywriter_id: copywriterId })
    .eq('id', orderId)
    .in('status', ['In Progress', 'Needs changes']);

  if (updateError) throw new Error(updateError.message);

  await recordAudit({
    entityType: 'order',
    entityId: orderId,
    action: 'order.reassign',
    before: { copywriter_id: previousCopywriterId },
    after: { copywriter_id: copywriterId },
  });

  const notifications = [
    notify({ recipientId: copywriterId, type: 'order.assigned', payload: { orderId, reassigned: true } }),
  ];
  if (previousCopywriterId && previousCopywriterId !== copywriterId) {
    notifications.push(
      notify({ recipientId: previousCopywriterId, type: 'order.reassigned_away', payload: { orderId } }),
    );
  }
  await Promise.all(notifications);

  revalidatePath('/dashboard/orders');
  revalidatePath(`/dashboard/orders/${orderId}`);
}

export async function saveOrderContent(input: SaveOrderContentInput): Promise<void> {
  const actor = await requireRole(['Copywriter']).catch(mapForbidden);

  const parsed = saveOrderContentSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const { orderId, body } = parsed.data;

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, copywriter_id')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new AppError('NOT_FOUND', 'Order not found');
  if (order.copywriter_id !== actor.id) throw new AppError('FORBIDDEN', 'You are not assigned to this order');
  if (!TRANSITION_GUARDS.saveContent.includes(order.status)) {
    throw new AppError('VALIDATION', `Cannot edit content on an order with status "${order.status}"`);
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ content_body: body })
    .eq('id', orderId)
    .in('status', ['In Progress', 'Needs changes']);

  if (updateError) throw new Error(updateError.message);

  await recordAudit({
    entityType: 'order',
    entityId: orderId,
    action: 'order.content_saved',
    after: { content_length: body.length },
  });

  revalidatePath(`/dashboard/orders/${orderId}/edit`);
}

export async function submitOrderContent(input: SubmitOrderContentInput): Promise<void> {
  const actor = await requireRole(['Copywriter']).catch(mapForbidden);

  const parsed = submitOrderContentSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const { orderId } = parsed.data;

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, copywriter_id, content_body, manager_id, created_by_id')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new AppError('NOT_FOUND', 'Order not found');
  if (order.copywriter_id !== actor.id) throw new AppError('FORBIDDEN', 'You are not assigned to this order');
  if (!TRANSITION_GUARDS.submitContent.includes(order.status)) {
    throw new AppError('VALIDATION', `Cannot submit content on an order with status "${order.status}"`);
  }
  if (!order.content_body || order.content_body.length < 50) {
    throw new AppError('VALIDATION', 'Content must be at least 50 characters');
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'Content Sent', sent_at: new Date().toISOString() })
    .eq('id', orderId)
    .in('status', ['In Progress', 'Needs changes']);

  if (updateError) throw new Error(updateError.message);

  await recordAudit({
    entityType: 'order',
    entityId: orderId,
    action: 'order.submit',
    before: { status: order.status },
    after: { status: 'Content Sent' },
  });

  const notifications: Promise<void>[] = [];
  if (order.manager_id) {
    notifications.push(
      notify({ recipientId: order.manager_id, type: 'order.content_sent', payload: { orderId } }),
    );
  }
  notifications.push(
    notify({ recipientId: order.created_by_id, type: 'order.content_sent', payload: { orderId } }),
  );
  await Promise.all(notifications);

  revalidatePath('/dashboard/orders');
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath(`/dashboard/orders/${orderId}/edit`);
}

export async function listCopywriters(): Promise<{ id: string; first_name: string; last_name: string }[]> {
  await requireRole(['Manager', 'Admin']).catch(mapForbidden);
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('role', 'Copywriter')
    .eq('status', 'ACTIVE')
    .order('first_name');
  return data ?? [];
}

export async function approveOrder(input: ApproveOrderInput): Promise<void> {
  const actor = await requireRole(['Client']).catch(mapForbidden);

  const parsed = approveOrderSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const { orderId } = parsed.data;

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, created_by_id, manager_id, copywriter_id')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new AppError('NOT_FOUND', 'Order not found');
  if (order.created_by_id !== actor.id) throw new AppError('FORBIDDEN', 'You do not own this order');
  if (!TRANSITION_GUARDS.approve.includes(order.status)) {
    throw new AppError('VALIDATION', `Cannot approve an order with status "${order.status}"`);
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'Content Approved', approved_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', 'Content Sent');

  if (updateError) throw new Error(updateError.message);

  await recordAudit({
    entityType: 'order',
    entityId: orderId,
    action: 'order.approved',
    before: { status: order.status },
    after: { status: 'Content Approved' },
  });

  const notifications: Promise<void>[] = [];
  if (order.manager_id) {
    notifications.push(notify({ recipientId: order.manager_id, type: 'order.content_approved', payload: { orderId } }));
  } else {
    const { data: managers } = await supabase.from('users').select('id').eq('role', 'Manager').eq('status', 'ACTIVE');
    (managers ?? []).forEach((m) =>
      notifications.push(notify({ recipientId: m.id, type: 'order.content_approved', payload: { orderId } })),
    );
  }
  if (order.copywriter_id) {
    notifications.push(notify({ recipientId: order.copywriter_id, type: 'order.content_approved', payload: { orderId } }));
  }
  await Promise.all(notifications);

  revalidatePath('/dashboard/orders');
  revalidatePath(`/dashboard/orders/${orderId}`);
}

export async function rejectOrder(input: RejectOrderInput): Promise<void> {
  const actor = await requireRole(['Client']).catch(mapForbidden);

  const parsed = rejectOrderSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const { orderId, comment } = parsed.data;

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, created_by_id, manager_id, copywriter_id')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new AppError('NOT_FOUND', 'Order not found');
  if (order.created_by_id !== actor.id) throw new AppError('FORBIDDEN', 'You do not own this order');
  if (!TRANSITION_GUARDS.reject.includes(order.status)) {
    throw new AppError('VALIDATION', `Cannot reject an order with status "${order.status}"`);
  }

  // Insert comment row first
  const { error: commentError } = await supabase
    .from('comments')
    .insert({ order_id: orderId, created_by_id: actor.id, text: comment });

  if (commentError) throw new Error(commentError.message);

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'Needs changes' })
    .eq('id', orderId)
    .eq('status', 'Content Sent');

  if (updateError) throw new Error(updateError.message);

  await recordAudit({
    entityType: 'order',
    entityId: orderId,
    action: 'order.rejected',
    before: { status: order.status },
    after: { status: 'Needs changes' },
  });

  const notifications: Promise<void>[] = [];
  if (order.copywriter_id) {
    notifications.push(notify({ recipientId: order.copywriter_id, type: 'order.needs_changes', payload: { orderId } }));
  }
  if (order.manager_id) {
    notifications.push(notify({ recipientId: order.manager_id, type: 'order.needs_changes', payload: { orderId } }));
  }
  await Promise.all(notifications);

  revalidatePath('/dashboard/orders');
  revalidatePath(`/dashboard/orders/${orderId}`);
}

export async function addComment(input: AddCommentInput): Promise<void> {
  const actor = await requireRole(['Client', 'Copywriter', 'Manager', 'Admin']).catch(mapForbidden);

  const parsed = addCommentSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const { orderId, text } = parsed.data;

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, created_by_id, manager_id, copywriter_id')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new AppError('NOT_FOUND', 'Order not found');

  // Enforce viewer-level access per role
  if (actor.role === 'Client' && order.created_by_id !== actor.id) {
    throw new AppError('FORBIDDEN', 'You do not have access to this order');
  }
  if (actor.role === 'Copywriter' && order.copywriter_id !== actor.id) {
    throw new AppError('FORBIDDEN', 'You are not assigned to this order');
  }

  const { error: commentError } = await supabase
    .from('comments')
    .insert({ order_id: orderId, created_by_id: actor.id, text });

  if (commentError) throw new Error(commentError.message);

  await recordAudit({
    entityType: 'order',
    entityId: orderId,
    action: 'order.comment_added',
    after: { actor_id: actor.id },
  });

  // Notify everyone on the order except the actor
  const recipientIds = new Set<string>();
  if (order.created_by_id && order.created_by_id !== actor.id) recipientIds.add(order.created_by_id);
  if (order.copywriter_id && order.copywriter_id !== actor.id) recipientIds.add(order.copywriter_id);
  if (order.manager_id && order.manager_id !== actor.id) recipientIds.add(order.manager_id);

  await Promise.all(
    [...recipientIds].map((id) =>
      notify({ recipientId: id, type: 'order.comment_added', payload: { orderId } }),
    ),
  );

  revalidatePath(`/dashboard/orders/${orderId}`);
}

export async function publishOrder(input: PublishOrderInput): Promise<void> {
  const actor = await requireRole(['Manager', 'Admin']).catch(mapForbidden);

  const parsed = publishOrderSchema.safeParse(input);
  if (!parsed.success) throw new AppError('VALIDATION', parsed.error.issues[0].message);

  const { orderId, published_url, publish_date } = parsed.data;

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, site_id, created_by_id, manager_id, copywriter_id')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new AppError('NOT_FOUND', 'Order not found');
  if (!TRANSITION_GUARDS.publish.includes(order.status)) {
    throw new AppError('VALIDATION', `Cannot publish an order with status "${order.status}"`);
  }

  // Snapshot the sourcer payout onto the order so future changes to the site
  // don't retroactively shift historical earnings.
  const { data: site } = await supabase
    .from('sites')
    .select('sourcer_id, sourcer_payout_cents')
    .eq('id', order.site_id)
    .single();
  const sourcerPayoutCents =
    site?.sourcer_id && site.sourcer_payout_cents > 0 ? site.sourcer_payout_cents : null;

  const now = new Date();
  // billing_month is derived from publish_date (the business event the client
  // chose) rather than `now`, so an order published at 22:00 ET on April 30
  // bills as April, not May (it would roll into May under naive UTC `now`).
  const billingMonth = firstOfMonth(publish_date);
  const publishDateStr = publish_date.toISOString().split('T')[0];

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'Published',
      published_at: now.toISOString(),
      published_by_id: actor.id,
      published_url,
      publish_date: publishDateStr,
      billing_month: billingMonth,
      sourcer_payout_cents: sourcerPayoutCents,
    })
    .eq('id', orderId)
    .eq('status', 'Content Approved');

  if (updateError) throw new Error(updateError.message);

  await recordAudit({
    entityType: 'order',
    entityId: orderId,
    action: 'order.published',
    before: { status: order.status },
    after: {
      status: 'Published',
      published_url,
      billing_month: billingMonth,
      sourcer_payout_cents: sourcerPayoutCents,
    },
  });

  const notifications: Promise<void>[] = [
    notify({ recipientId: order.created_by_id, type: 'order.published', payload: { orderId, published_url } }),
  ];
  if (order.copywriter_id) {
    notifications.push(
      notify({ recipientId: order.copywriter_id, type: 'order.published', payload: { orderId } }),
    );
  }
  await Promise.all(notifications);

  revalidatePath('/dashboard/orders');
  revalidatePath(`/dashboard/orders/${orderId}`);
}
