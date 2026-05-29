import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserRow } from '@/lib/features/auth';

const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: mockFrom, rpc: mockRpc })),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const mockRecordAudit = vi.fn();
const mockNotify = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('@/lib/features/audit', () => ({ recordAudit: mockRecordAudit }));
vi.mock('@/lib/features/notify', () => ({ notify: mockNotify }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

const makeUser = (overrides: Partial<UserRow> = {}): UserRow => ({
  id: 'user-1',
  email: 'user@test.com',
  role: 'Client',
  status: 'ACTIVE',
  first_name: 'Test',
  last_name: 'User',
  manager_id: null,
  created_by_id: null,
  invited_at: null,
  disabled_reason: null,
  avatar: null,
  ...overrides,
});

const mockRequireUser = vi.fn(async () => makeUser());
const mockGetCurrentUser = vi.fn(async () => makeUser());

vi.mock('@/lib/features/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/features/auth')>();
  return {
    ...actual,
    requireUser: mockRequireUser,
    getCurrentUser: mockGetCurrentUser,
  };
});

const {
  createChat,
  editChat,
  archiveChat,
  unarchiveChat,
  sendMessage,
  startOrderChat,
  ensureAutoChats,
} = await import('./actions');

type ChainResult = { data: unknown; error: unknown };

// Thenable chain: chaining returns the chain; awaiting resolves to `result`.
// `single()` returns a promise directly (matches Supabase contract).
function makeChain(result: ChainResult) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'in',
    'neq',
    'is',
    'not',
    'order',
    'limit',
  ];
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain['single'] = vi.fn(() => Promise.resolve(result));
  chain['maybeSingle'] = vi.fn(() => Promise.resolve(result));
  (
    chain as {
      then: (onFulfilled: (v: unknown) => unknown) => Promise<unknown>;
    }
  ).then = (onFulfilled) => Promise.resolve(result).then(onFulfilled);
  return chain;
}

const CHAT_1 = 'c1000001-0000-4000-8000-000000000001';
const ORD_1 = 'a0000001-0000-4000-8000-000000000001';
const USER_1 = 'b0000001-0000-4000-8000-000000000001';
const USER_2 = 'b0000002-0000-4000-8000-000000000002';
const USER_3 = 'b0000003-0000-4000-8000-000000000003';
const CW_1 = 'd0000001-0000-4000-8000-000000000001';
const MGR_1 = 'd0000002-0000-4000-8000-000000000002';

describe('createChat()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a Standard chat, adds participants (including actor), audits, notifies others, revalidates', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser({ id: USER_1 }));
    const chatInsert = makeChain({ data: { id: CHAT_1 }, error: null });
    const partInsert = makeChain({ data: null, error: null });
    mockAdminFrom
      .mockReturnValueOnce(chatInsert)
      .mockReturnValueOnce(partInsert);

    const result = await createChat({
      title: 'Project chat',
      userIds: [USER_2, USER_3],
    });

    expect(result).toEqual({ chatId: CHAT_1 });
    expect(mockAdminFrom).toHaveBeenCalledWith('chats');
    expect(chatInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        created_by_id: USER_1,
        category: 'Standard',
        title: 'Project chat',
        status: 'Active',
      }),
    );
    expect(mockAdminFrom).toHaveBeenCalledWith('chat_participants');
    expect(partInsert.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        { chat_id: CHAT_1, user_id: USER_1 },
        { chat_id: CHAT_1, user_id: USER_2 },
        { chat_id: CHAT_1, user_id: USER_3 },
      ]),
    );
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'chat.created', entityId: CHAT_1 }),
    );
    // notify everyone except the actor
    expect(mockNotify).toHaveBeenCalledTimes(2);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: USER_2,
        type: 'chat.created',
        payload: { chatId: CHAT_1 },
      }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: USER_3 }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/chat');
  });

  it('throws VALIDATION when title is empty', async () => {
    await expect(
      createChat({ title: '', userIds: [USER_2, USER_3] }),
    ).rejects.toThrow('Title');
  });

  it('throws VALIDATION when fewer than 2 userIds', async () => {
    await expect(createChat({ title: 'X', userIds: [USER_2] })).rejects.toThrow(
      'participants',
    );
  });
});

describe('editChat()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('allows the creator to edit title and update participants (add + remove)', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: USER_1, role: 'Client' }),
    );
    const chatSelect = makeChain({
      data: {
        id: CHAT_1,
        category: 'Standard',
        created_by_id: USER_1,
        title: 'Old',
      },
      error: null,
    });
    const partsSelect = makeChain({
      data: [{ user_id: USER_1 }, { user_id: USER_2 }],
      error: null,
    });
    const titleUpdate = makeChain({ data: null, error: null });
    const addInsert = makeChain({ data: null, error: null });
    const removeDelete = makeChain({ data: null, error: null });

    mockAdminFrom
      .mockReturnValueOnce(chatSelect)
      .mockReturnValueOnce(partsSelect)
      .mockReturnValueOnce(titleUpdate)
      .mockReturnValueOnce(addInsert)
      .mockReturnValueOnce(removeDelete);

    await editChat({ chatId: CHAT_1, title: 'New', userIds: [USER_3, USER_1] });

    expect(titleUpdate.update).toHaveBeenCalledWith({ title: 'New' });
    expect(addInsert.insert).toHaveBeenCalledWith([
      { chat_id: CHAT_1, user_id: USER_3 },
    ]);
    expect(removeDelete.delete).toHaveBeenCalled();
    expect(removeDelete.in).toHaveBeenCalledWith('user_id', [USER_2]);
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'chat.edited', entityId: CHAT_1 }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: USER_3,
        type: 'chat.participant_added',
      }),
    );
  });

  it('throws FORBIDDEN when caller is not creator or admin', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: USER_2, role: 'Client' }),
    );
    const chatSelect = makeChain({
      data: { id: CHAT_1, category: 'Standard', created_by_id: USER_1 },
      error: null,
    });
    mockAdminFrom.mockReturnValueOnce(chatSelect);

    await expect(
      editChat({ chatId: CHAT_1, title: 'X', userIds: [USER_2, USER_3] }),
    ).rejects.toThrow('creator or an admin');
  });

  it('throws FORBIDDEN when category is not Standard', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser({ id: USER_1 }));
    const chatSelect = makeChain({
      data: { id: CHAT_1, category: 'Support', created_by_id: USER_1 },
      error: null,
    });
    mockAdminFrom.mockReturnValueOnce(chatSelect);

    await expect(
      editChat({ chatId: CHAT_1, title: 'X', userIds: [USER_2, USER_3] }),
    ).rejects.toThrow('Standard');
  });

  it('throws NOT_FOUND when chat does not exist', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser());
    const chatSelect = makeChain({ data: null, error: null });
    mockAdminFrom.mockReturnValueOnce(chatSelect);

    await expect(
      editChat({ chatId: CHAT_1, title: 'X', userIds: [USER_2, USER_3] }),
    ).rejects.toThrow('Chat not found');
  });
});

describe('archiveChat()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('archives an active Standard chat when caller is creator', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser({ id: USER_1 }));
    const chatSelect = makeChain({
      data: {
        id: CHAT_1,
        category: 'Standard',
        status: 'Active',
        created_by_id: USER_1,
      },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockAdminFrom
      .mockReturnValueOnce(chatSelect)
      .mockReturnValueOnce(updateChain);

    await archiveChat({ chatId: CHAT_1 });

    expect(updateChain.update).toHaveBeenCalledWith({ status: 'Archived' });
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'chat.archived' }),
    );
  });

  it('throws VALIDATION when chat is not active', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser({ id: USER_1 }));
    const chatSelect = makeChain({
      data: {
        id: CHAT_1,
        category: 'Standard',
        status: 'Archived',
        created_by_id: USER_1,
      },
      error: null,
    });
    mockAdminFrom.mockReturnValueOnce(chatSelect);

    await expect(archiveChat({ chatId: CHAT_1 })).rejects.toThrow('not active');
  });

  it('throws FORBIDDEN when caller is not creator or admin', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: USER_2, role: 'Client' }),
    );
    const chatSelect = makeChain({
      data: {
        id: CHAT_1,
        category: 'Standard',
        status: 'Active',
        created_by_id: USER_1,
      },
      error: null,
    });
    mockAdminFrom.mockReturnValueOnce(chatSelect);

    await expect(archiveChat({ chatId: CHAT_1 })).rejects.toThrow(
      'creator or an admin',
    );
  });
});

describe('unarchiveChat()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('unarchives an archived chat when caller is admin', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: USER_2, role: 'Admin' }),
    );
    const chatSelect = makeChain({
      data: { id: CHAT_1, status: 'Archived', created_by_id: USER_1 },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockAdminFrom
      .mockReturnValueOnce(chatSelect)
      .mockReturnValueOnce(updateChain);

    await unarchiveChat({ chatId: CHAT_1 });

    expect(updateChain.update).toHaveBeenCalledWith({ status: 'Active' });
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'chat.unarchived' }),
    );
  });

  it('throws VALIDATION when chat is not archived', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser({ id: USER_1 }));
    const chatSelect = makeChain({
      data: { id: CHAT_1, status: 'Active', created_by_id: USER_1 },
      error: null,
    });
    mockAdminFrom.mockReturnValueOnce(chatSelect);

    await expect(unarchiveChat({ chatId: CHAT_1 })).rejects.toThrow(
      'not archived',
    );
  });
});

describe('sendMessage()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts the message and notifies the other participants', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser({ id: USER_1 }));
    const chatSelect = makeChain({ data: { status: 'Active' }, error: null });
    const partSelect = makeChain({ data: { user_id: USER_1 }, error: null });
    const msgInsert = makeChain({ data: null, error: null });
    const allPartsSelect = makeChain({
      data: [{ user_id: USER_2 }, { user_id: USER_3 }],
      error: null,
    });
    mockAdminFrom
      .mockReturnValueOnce(chatSelect)
      .mockReturnValueOnce(partSelect)
      .mockReturnValueOnce(msgInsert)
      .mockReturnValueOnce(allPartsSelect);

    await sendMessage({ chatId: CHAT_1, content: 'Hello team' });

    expect(msgInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        chat_id: CHAT_1,
        created_by_id: USER_1,
        content: 'Hello team',
        read_by: [USER_1],
      }),
    );
    expect(mockNotify).toHaveBeenCalledTimes(2);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: USER_2,
        type: 'chat.message_sent',
        payload: { chatId: CHAT_1 },
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/dashboard/chat/${CHAT_1}`,
    );
  });

  it('throws FORBIDDEN when chat is archived', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser({ id: USER_1 }));
    const chatSelect = makeChain({ data: { status: 'Archived' }, error: null });
    mockAdminFrom.mockReturnValueOnce(chatSelect);

    await expect(
      sendMessage({ chatId: CHAT_1, content: 'hi' }),
    ).rejects.toThrow('archived');
  });

  it('throws FORBIDDEN when caller is not a participant', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser({ id: USER_1 }));
    const chatSelect = makeChain({ data: { status: 'Active' }, error: null });
    const partSelect = makeChain({ data: null, error: null });
    mockAdminFrom
      .mockReturnValueOnce(chatSelect)
      .mockReturnValueOnce(partSelect);

    await expect(
      sendMessage({ chatId: CHAT_1, content: 'hi' }),
    ).rejects.toThrow('participant');
  });

  it('throws VALIDATION when content is empty', async () => {
    await expect(sendMessage({ chatId: CHAT_1, content: '' })).rejects.toThrow(
      'empty',
    );
  });
});

// markChatRead used to live as a server action and was tested here. It is now
// served by the POST /api/chat/mark-read route handler — see its integration
// tests for the merged `mark_chat_read` RPC behavior.

describe('startOrderChat()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns existing chat id when order is already linked', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );
    const orderSelect = makeChain({
      data: {
        id: ORD_1,
        chat_id: CHAT_1,
        copywriter_id: CW_1,
        manager_id: MGR_1,
        created_by_id: USER_1,
        site_domain: 'example.com',
      },
      error: null,
    });
    mockAdminFrom.mockReturnValueOnce(orderSelect);

    const result = await startOrderChat({ orderId: ORD_1 });
    expect(result).toEqual({ chatId: CHAT_1 });
    // No new chat created, no audit, no notifications
    expect(mockAdminFrom).toHaveBeenCalledTimes(1);
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });

  it('creates a chat with copywriter+manager+actor, links order, audits, revalidates', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: USER_1, role: 'Client' }),
    );
    const orderSelect = makeChain({
      data: {
        id: ORD_1,
        chat_id: null,
        copywriter_id: CW_1,
        manager_id: MGR_1,
        created_by_id: USER_1,
        site_domain: 'example.com',
      },
      error: null,
    });
    const chatInsert = makeChain({ data: { id: CHAT_1 }, error: null });
    const partInsert = makeChain({ data: null, error: null });
    const orderUpdate = makeChain({ data: null, error: null });

    mockAdminFrom
      .mockReturnValueOnce(orderSelect)
      .mockReturnValueOnce(chatInsert)
      .mockReturnValueOnce(partInsert)
      .mockReturnValueOnce(orderUpdate);

    const result = await startOrderChat({ orderId: ORD_1 });

    expect(result).toEqual({ chatId: CHAT_1 });
    expect(chatInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'example.com',
        category: 'Standard',
        status: 'Active',
        created_by_id: USER_1,
      }),
    );
    expect(partInsert.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        { chat_id: CHAT_1, user_id: CW_1 },
        { chat_id: CHAT_1, user_id: MGR_1 },
        { chat_id: CHAT_1, user_id: USER_1 },
      ]),
    );
    expect(orderUpdate.update).toHaveBeenCalledWith({ chat_id: CHAT_1 });
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'chat.created_from_order',
        entityId: CHAT_1,
        after: { orderId: ORD_1 },
      }),
    );
  });

  it('throws FORBIDDEN when Client did not create the order', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: USER_2, role: 'Client' }),
    );
    const orderSelect = makeChain({
      data: {
        id: ORD_1,
        chat_id: null,
        copywriter_id: CW_1,
        manager_id: MGR_1,
        created_by_id: USER_1,
        site_domain: 'x',
      },
      error: null,
    });
    mockAdminFrom.mockReturnValueOnce(orderSelect);

    await expect(startOrderChat({ orderId: ORD_1 })).rejects.toThrow(
      'Access denied',
    );
  });

  it('throws FORBIDDEN when Copywriter is not assigned', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: 'other-cw', role: 'Copywriter' }),
    );
    const orderSelect = makeChain({
      data: {
        id: ORD_1,
        chat_id: null,
        copywriter_id: CW_1,
        manager_id: MGR_1,
        created_by_id: USER_1,
        site_domain: 'x',
      },
      error: null,
    });
    mockAdminFrom.mockReturnValueOnce(orderSelect);

    await expect(startOrderChat({ orderId: ORD_1 })).rejects.toThrow(
      'Access denied',
    );
  });

  it('throws VALIDATION when order has no copywriter assigned', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: USER_1, role: 'Client' }),
    );
    const orderSelect = makeChain({
      data: {
        id: ORD_1,
        chat_id: null,
        copywriter_id: null,
        manager_id: null,
        created_by_id: USER_1,
        site_domain: 'x',
      },
      error: null,
    });
    mockAdminFrom.mockReturnValueOnce(orderSelect);

    await expect(startOrderChat({ orderId: ORD_1 })).rejects.toThrow(
      'copywriter',
    );
  });

  it('throws NOT_FOUND when order does not exist', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser());
    const orderSelect = makeChain({ data: null, error: null });
    mockAdminFrom.mockReturnValueOnce(orderSelect);

    await expect(startOrderChat({ orderId: ORD_1 })).rejects.toThrow(
      'Order not found',
    );
  });
});

describe('ensureAutoChats()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts support + sales chats for Client users', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(
      makeUser({ id: USER_1, role: 'Client' }),
    );
    mockRpc.mockResolvedValue({ data: null, error: null });

    await ensureAutoChats();

    expect(mockRpc).toHaveBeenCalledWith('upsert_support_chat', {
      p_user_id: USER_1,
    });
    expect(mockRpc).toHaveBeenCalledWith('upsert_sales_chat', {
      p_user_id: USER_1,
    });
  });

  it('does nothing for non-Client users', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(makeUser({ role: 'Manager' }));
    await ensureAutoChats();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('does nothing when there is no current user', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null as unknown as UserRow);
    await ensureAutoChats();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
