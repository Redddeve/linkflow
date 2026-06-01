'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchActiveUsers, type ChatParticipant } from '@/lib/data/chat';
import { requireUser, getCurrentUser } from '@/lib/features/auth';
import { recordAudit } from '@/lib/features/audit';
import { notify } from '@/lib/features/notify';
import type { ActionResult } from '@/lib/errors';
import {
  createChatSchema,
  editChatSchema,
  changeChatStatusSchema,
  sendMessageSchema,
  startOrderChatSchema,
  type CreateChatInput,
  type EditChatInput,
  type ChangeChatStatusInput,
  type SendMessageInput,
  type StartOrderChatInput,
} from '@/lib/schemas/chat';

export async function createChat(
  input: CreateChatInput,
): Promise<ActionResult<{ chatId: string }>> {
  const actor = await requireUser();
  const parsed = createChatSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: 'VALIDATION',
      message: parsed.error.issues[0].message,
    };
  }

  const { title, userIds } = parsed.data;
  const participantIds = [...new Set([...userIds, actor.id])];

  const adminDb = createAdminClient();

  const { data: chat, error: chatError } = await adminDb
    .from('chats')
    .insert({
      created_by_id: actor.id,
      category: 'Standard',
      title,
      status: 'Active',
    })
    .select('id')
    .single();

  if (chatError || !chat) {
    return {
      success: false,
      code: 'UNKNOWN',
      message: chatError?.message ?? 'Failed to create chat',
    };
  }

  const { error: participantsError } = await adminDb
    .from('chat_participants')
    .insert(
      participantIds.map((userId) => ({ chat_id: chat.id, user_id: userId })),
    );

  if (participantsError) {
    return {
      success: false,
      code: 'UNKNOWN',
      message: participantsError.message,
    };
  }

  await recordAudit({
    entityType: 'chat',
    entityId: chat.id,
    action: 'chat.created',
  });

  const otherIds = participantIds.filter((id) => id !== actor.id);
  await Promise.all(
    otherIds.map((id) =>
      notify({
        recipientId: id,
        type: 'chat.created',
        payload: { chatId: chat.id },
      }),
    ),
  );

  revalidatePath('/dashboard/chat');
  return { success: true, data: { chatId: chat.id } };
}

export async function editChat(input: EditChatInput): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = editChatSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: 'VALIDATION',
      message: parsed.error.issues[0].message,
    };
  }

  const { chatId, title, userIds } = parsed.data;
  const adminDb = createAdminClient();

  const { data: chat } = await adminDb
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single();
  if (!chat) {
    return { success: false, code: 'NOT_FOUND', message: 'Chat not found' };
  }
  if (chat.category !== 'Standard') {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'Only Standard chats can be edited',
    };
  }

  const isCreator = chat.created_by_id === actor.id;
  const isAdmin = actor.role === 'Admin';
  if (!isCreator && !isAdmin) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'Only the chat creator or an admin can edit this chat',
    };
  }

  const { data: participants } = await adminDb
    .from('chat_participants')
    .select('user_id')
    .eq('chat_id', chatId);

  const currentIds = new Set((participants ?? []).map((p) => p.user_id));
  const newIds = [...new Set([...userIds, chat.created_by_id])];

  await adminDb.from('chats').update({ title }).eq('id', chatId);

  const toAdd = newIds.filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !newIds.includes(id));

  if (toAdd.length) {
    await adminDb
      .from('chat_participants')
      .insert(toAdd.map((userId) => ({ chat_id: chatId, user_id: userId })));
  }
  if (toRemove.length) {
    await adminDb
      .from('chat_participants')
      .delete()
      .eq('chat_id', chatId)
      .in('user_id', toRemove);
  }

  await recordAudit({
    entityType: 'chat',
    entityId: chatId,
    action: 'chat.edited',
  });

  if (toAdd.length) {
    await Promise.all(
      toAdd.map((id) =>
        notify({
          recipientId: id,
          type: 'chat.participant_added',
          payload: { chatId },
        }),
      ),
    );
  }

  revalidatePath('/dashboard/chat');
  revalidatePath(`/dashboard/chat/${chatId}`);
  return { success: true };
}

export async function archiveChat(
  input: ChangeChatStatusInput,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = changeChatStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: 'VALIDATION',
      message: parsed.error.issues[0].message,
    };
  }

  const { chatId } = parsed.data;
  const adminDb = createAdminClient();

  const { data: chat } = await adminDb
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single();
  if (!chat) {
    return { success: false, code: 'NOT_FOUND', message: 'Chat not found' };
  }
  if (chat.category !== 'Standard') {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'Only Standard chats can be archived',
    };
  }
  if (chat.status !== 'Active') {
    return {
      success: false,
      code: 'VALIDATION',
      message: 'Chat is not active',
    };
  }

  const isCreator = chat.created_by_id === actor.id;
  const isAdmin = actor.role === 'Admin';
  if (!isCreator && !isAdmin) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'Only the chat creator or an admin can archive this chat',
    };
  }

  await adminDb.from('chats').update({ status: 'Archived' }).eq('id', chatId);
  await recordAudit({
    entityType: 'chat',
    entityId: chatId,
    action: 'chat.archived',
  });

  revalidatePath('/dashboard/chat');
  revalidatePath(`/dashboard/chat/${chatId}`);
  return { success: true };
}

export async function unarchiveChat(
  input: ChangeChatStatusInput,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = changeChatStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: 'VALIDATION',
      message: parsed.error.issues[0].message,
    };
  }

  const { chatId } = parsed.data;
  const adminDb = createAdminClient();

  const { data: chat } = await adminDb
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single();
  if (!chat) {
    return { success: false, code: 'NOT_FOUND', message: 'Chat not found' };
  }
  if (chat.status !== 'Archived') {
    return {
      success: false,
      code: 'VALIDATION',
      message: 'Chat is not archived',
    };
  }

  const isCreator = chat.created_by_id === actor.id;
  const isAdmin = actor.role === 'Admin';
  if (!isCreator && !isAdmin) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'Only the chat creator or an admin can unarchive this chat',
    };
  }

  await adminDb.from('chats').update({ status: 'Active' }).eq('id', chatId);
  await recordAudit({
    entityType: 'chat',
    entityId: chatId,
    action: 'chat.unarchived',
  });

  revalidatePath('/dashboard/chat');
  revalidatePath(`/dashboard/chat/${chatId}`);
  return { success: true };
}

export async function sendMessage(
  input: SendMessageInput,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: 'VALIDATION',
      message: parsed.error.issues[0].message,
    };
  }

  const { chatId, content } = parsed.data;
  const adminDb = createAdminClient();

  const { data: chat } = await adminDb
    .from('chats')
    .select('status')
    .eq('id', chatId)
    .single();
  if (!chat) {
    return { success: false, code: 'NOT_FOUND', message: 'Chat not found' };
  }
  if (chat.status === 'Archived') {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'This chat is archived. Unarchive it to send messages.',
    };
  }

  const { data: participant } = await adminDb
    .from('chat_participants')
    .select('user_id')
    .eq('chat_id', chatId)
    .eq('user_id', actor.id)
    .single();

  if (!participant) {
    return {
      success: false,
      code: 'FORBIDDEN',
      message: 'You are not a participant of this chat',
    };
  }

  const { error } = await adminDb.from('chat_messages').insert({
    chat_id: chatId,
    created_by_id: actor.id,
    content,
    read_by: [actor.id],
  });

  if (error) {
    return { success: false, code: 'UNKNOWN', message: error.message };
  }

  // Notify all other participants
  const { data: allParticipants } = await adminDb
    .from('chat_participants')
    .select('user_id')
    .eq('chat_id', chatId)
    .neq('user_id', actor.id);

  await Promise.all(
    (allParticipants ?? []).map((p) =>
      notify({
        recipientId: p.user_id,
        type: 'chat.message_sent',
        payload: { chatId },
      }),
    ),
  );

  revalidatePath(`/dashboard/chat/${chatId}`);
  return { success: true };
}

export async function listActiveUsersForChat(): Promise<ChatParticipant[]> {
  await requireUser();
  return fetchActiveUsers();
}

// markChatRead intentionally lives at /api/chat/mark-read (POST) instead of
// here. The client fires it with `fetch({ keepalive: true })` so it survives
// route changes without blocking the UI. Calling it as a Server Action would
// queue it behind React's transition and add a `revalidatePath` cost the side
// effect doesn't need.

export async function startOrderChat(
  input: StartOrderChatInput,
): Promise<ActionResult<{ chatId: string }>> {
  const actor = await requireUser();
  const parsed = startOrderChatSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: 'VALIDATION',
      message: parsed.error.issues[0].message,
    };
  }

  const { orderId } = parsed.data;
  const adminDb = createAdminClient();

  const { data: order } = await adminDb
    .from('orders')
    .select(
      'id, chat_id, copywriter_id, manager_id, created_by_id, site_domain',
    )
    .eq('id', orderId)
    .single();

  if (!order) {
    return { success: false, code: 'NOT_FOUND', message: 'Order not found' };
  }

  // Access check
  if (actor.role === 'Client' && order.created_by_id !== actor.id) {
    return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
  }
  if (actor.role === 'Copywriter' && order.copywriter_id !== actor.id) {
    return { success: false, code: 'FORBIDDEN', message: 'Access denied' };
  }

  // Return existing chat if already linked
  if (order.chat_id) {
    return { success: true, data: { chatId: order.chat_id } };
  }

  // Build participant list: all assigned people on the order + the actor
  const participantIds = [
    ...new Set(
      [
        order.created_by_id,
        order.copywriter_id,
        order.manager_id,
        actor.id,
      ].filter(Boolean) as string[],
    ),
  ];

  if (participantIds.length < 2) {
    return {
      success: false,
      code: 'VALIDATION',
      message: 'Cannot start chat: order needs a copywriter assigned',
    };
  }

  const { data: chat, error: chatError } = await adminDb
    .from('chats')
    .insert({
      created_by_id: actor.id,
      category: 'Standard',
      title: order.site_domain,
      status: 'Active',
    })
    .select('id')
    .single();

  if (chatError || !chat) {
    return {
      success: false,
      code: 'UNKNOWN',
      message: chatError?.message ?? 'Failed to create chat',
    };
  }

  await adminDb
    .from('chat_participants')
    .insert(
      participantIds.map((userId) => ({ chat_id: chat.id, user_id: userId })),
    );

  await adminDb.from('orders').update({ chat_id: chat.id }).eq('id', orderId);

  await recordAudit({
    entityType: 'chat',
    entityId: chat.id,
    action: 'chat.created_from_order',
    after: { orderId },
  });

  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath('/dashboard/chat');

  return { success: true, data: { chatId: chat.id } };
}

export async function ensureAutoChats(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'Client') return;

  const supabase = await createClient();
  await supabase.rpc('upsert_support_chat', { p_user_id: user.id });
  await supabase.rpc('upsert_sales_chat', { p_user_id: user.id });
}
