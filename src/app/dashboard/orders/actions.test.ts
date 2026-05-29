import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserRow } from '@/lib/features/auth';

// в”Ђв”Ђ Shared mock state в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

const mockRecordAudit = vi.fn();
const mockNotify = vi.fn();
const mockRevalidatePath = vi.fn();
const mockFetchOrdersList = vi.fn();
const mockFetchUsersByIds = vi.fn();

vi.mock('@/lib/features/audit', () => ({ recordAudit: mockRecordAudit }));
vi.mock('@/lib/features/notify', () => ({ notify: mockNotify }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));
vi.mock('@/lib/data/orders', () => ({ fetchOrdersList: mockFetchOrdersList }));
vi.mock('@/lib/data/users', () => ({ fetchUsersByIds: mockFetchUsersByIds }));

// в”Ђв”Ђ Auth mock helpers в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

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

const mockRequireRole = vi.fn(async () => makeUser());
const mockRequireUser = vi.fn(async () => makeUser());

vi.mock('@/lib/features/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/features/auth')>();
  return {
    ...actual,
    requireRole: mockRequireRole,
    requireUser: mockRequireUser,
  };
});

// в”Ђв”Ђ Import actions after mocks в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

const {
  editOrderPublishDate,
  cancelOrder,
  assignCopywriter,
  reassignCopywriter,
  saveOrderContent,
  submitOrderContent,
  approveOrder,
  rejectOrder,
  addComment,
  publishOrder,
  fetchOrdersColumn,
} = await import('./actions');

// в”Ђв”Ђ Fluent Supabase stub builder в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

type ChainResult = { data: unknown; error: unknown; count?: number };

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
    'maybeSingle',
    'single',
    'order',
    'limit',
  ];
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  (chain['single'] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  (chain['maybeSingle'] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  return chain;
}

// Use v4 UUIDs so Zod's .uuid() validation passes (Zod v4 requires version 1-8)
const ORD_1 = 'a0000001-0000-4000-8000-000000000001';
const CW_1 = 'a0000002-0000-4000-8000-000000000002';
const CW_OLD = 'a0000003-0000-4000-8000-000000000003';
const CW_NEW = 'a0000004-0000-4000-8000-000000000004';
const CW_OTHER = 'a0000005-0000-4000-8000-000000000005';
const MGR_1 = 'a0000006-0000-4000-8000-000000000006';
const CLIENT_1 = 'a0000007-0000-4000-8000-000000000007';
const CLIENT_2 = 'a0000008-0000-4000-8000-000000000008';

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

// в”Ђв”Ђ editOrderPublishDate в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

describe('editOrderPublishDate()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates publish_date for own New order', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CLIENT_1, role: 'Client' }),
    );
    const selectChain = makeChain({
      data: {
        id: ORD_1,
        status: 'New',
        created_by_id: CLIENT_1,
        manager_id: null,
      },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);

    await editOrderPublishDate({ orderId: ORD_1, publish_date: tomorrowStr });

    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'order.publish_date_changed',
        entityId: ORD_1,
      }),
    );
  });

  it('throws FORBIDDEN when caller is not Client', async () => {
    mockRequireRole.mockRejectedValueOnce(
      new Error('FORBIDDEN: requires role Client'),
    );
    await expect(
      editOrderPublishDate({ orderId: ORD_1, publish_date: tomorrowStr }),
    ).rejects.toThrow('permission');
  });

  it('throws FORBIDDEN when order belongs to another client', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CLIENT_1, role: 'Client' }),
    );
    const chain = makeChain({
      data: {
        id: ORD_1,
        status: 'New',
        created_by_id: CLIENT_2,
        manager_id: null,
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(
      editOrderPublishDate({ orderId: ORD_1, publish_date: tomorrowStr }),
    ).rejects.toThrow('own this order');
  });

  it('throws VALIDATION when order is not New', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CLIENT_1, role: 'Client' }),
    );
    const chain = makeChain({
      data: {
        id: ORD_1,
        status: 'In Progress',
        created_by_id: CLIENT_1,
        manager_id: null,
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(
      editOrderPublishDate({ orderId: ORD_1, publish_date: tomorrowStr }),
    ).rejects.toThrow('In Progress');
  });

  it('throws VALIDATION for past date', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CLIENT_1, role: 'Client' }),
    );
    await expect(
      editOrderPublishDate({ orderId: ORD_1, publish_date: '2020-01-01' }),
    ).rejects.toThrow('today or later');
  });
});

// в”Ђв”Ђ cancelOrder в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

describe('cancelOrder()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cancels a New order and notifies manager', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CLIENT_1, role: 'Client' }),
    );
    const selectChain = makeChain({
      data: {
        id: ORD_1,
        status: 'New',
        created_by_id: CLIENT_1,
        manager_id: MGR_1,
      },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);

    await cancelOrder({ orderId: ORD_1, reason: 'Changed mind' });

    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order.cancel', entityId: ORD_1 }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: MGR_1, type: 'order.canceled' }),
    );
  });

  it('notifies all managers when no manager assigned', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CLIENT_1, role: 'Client' }),
    );
    const selectChain = makeChain({
      data: {
        id: ORD_1,
        status: 'New',
        created_by_id: CLIENT_1,
        manager_id: null,
      },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    const managersResult = {
      data: [{ id: MGR_1 }, { id: 'a0000009-0000-4000-8000-000000000009' }],
      error: null,
    };
    // managers query chains two .eq() calls then resolves
    const managersQuery: Record<string, unknown> = {};
    managersQuery.select = vi.fn(() => managersQuery);
    managersQuery.eq = vi.fn(() => {
      const inner: Record<string, unknown> = {};
      inner.eq = vi.fn(() => Promise.resolve(managersResult));
      return inner;
    });

    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain)
      .mockReturnValue(managersQuery);

    await cancelOrder({ orderId: ORD_1 });
    expect(mockNotify).toHaveBeenCalledTimes(2);
  });

  it('throws VALIDATION when order is not New', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CLIENT_1, role: 'Client' }),
    );
    const chain = makeChain({
      data: {
        id: ORD_1,
        status: 'In Progress',
        created_by_id: CLIENT_1,
        manager_id: null,
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(cancelOrder({ orderId: ORD_1 })).rejects.toThrow(
      'In Progress',
    );
  });
});

// в”Ђв”Ђ assignCopywriter в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

describe('assignCopywriter()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('assigns copywriter and transitions to In Progress', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );

    const orderChain = makeChain({
      data: {
        id: ORD_1,
        status: 'New',
        created_by_id: CLIENT_1,
        manager_id: null,
      },
      error: null,
    });
    const cwChain = makeChain({
      data: { id: CW_1, role: 'Copywriter', status: 'ACTIVE' },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });

    mockFrom
      .mockReturnValueOnce(orderChain)
      .mockReturnValueOnce(cwChain)
      .mockReturnValue(updateChain);

    await assignCopywriter({ orderId: ORD_1, copywriterId: CW_1 });

    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order.assign' }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: CW_1, type: 'order.assigned' }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: CLIENT_1,
        type: 'order.in_progress',
      }),
    );
  });

  it('throws FORBIDDEN when caller is not Manager/Admin', async () => {
    mockRequireRole.mockRejectedValueOnce(
      new Error('FORBIDDEN: requires role Manager or Admin'),
    );
    await expect(
      assignCopywriter({ orderId: ORD_1, copywriterId: CW_1 }),
    ).rejects.toThrow('permission');
  });

  it('throws VALIDATION when order is not New', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );
    const orderChain = makeChain({
      data: {
        id: ORD_1,
        status: 'In Progress',
        created_by_id: CLIENT_1,
        manager_id: null,
      },
      error: null,
    });
    const cwChain = makeChain({
      data: { id: CW_1, role: 'Copywriter', status: 'ACTIVE' },
      error: null,
    });
    mockFrom.mockReturnValueOnce(orderChain).mockReturnValueOnce(cwChain);

    await expect(
      assignCopywriter({ orderId: ORD_1, copywriterId: CW_1 }),
    ).rejects.toThrow('In Progress');
  });

  it('throws VALIDATION when copywriter is DISABLED', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );
    const orderChain = makeChain({
      data: {
        id: ORD_1,
        status: 'New',
        created_by_id: CLIENT_1,
        manager_id: null,
      },
      error: null,
    });
    const cwChain = makeChain({
      data: { id: CW_1, role: 'Copywriter', status: 'DISABLED' },
      error: null,
    });
    mockFrom.mockReturnValueOnce(orderChain).mockReturnValueOnce(cwChain);

    await expect(
      assignCopywriter({ orderId: ORD_1, copywriterId: CW_1 }),
    ).rejects.toThrow('not active');
  });
});

// в”Ђв”Ђ reassignCopywriter в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

describe('reassignCopywriter()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reassigns and notifies only the new copywriter', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );
    const orderChain = makeChain({
      data: {
        id: ORD_1,
        status: 'In Progress',
        copywriter_id: CW_OLD,
        created_by_id: CLIENT_1,
      },
      error: null,
    });
    const cwChain = makeChain({
      data: { id: CW_NEW, role: 'Copywriter', status: 'ACTIVE' },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(orderChain)
      .mockReturnValueOnce(cwChain)
      .mockReturnValue(updateChain);

    await reassignCopywriter({ orderId: ORD_1, copywriterId: CW_NEW });

    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: CW_NEW, type: 'order.assigned' }),
    );
    // The previous copywriter is intentionally NOT notified on reassignment.
    expect(mockNotify).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'order.reassigned_away' }),
    );
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order.reassign' }),
    );
  });

  it('throws VALIDATION when order is New (cannot reassign)', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );
    const orderChain = makeChain({
      data: {
        id: ORD_1,
        status: 'New',
        copywriter_id: null,
        created_by_id: CLIENT_1,
      },
      error: null,
    });
    const cwChain = makeChain({
      data: { id: CW_1, role: 'Copywriter', status: 'ACTIVE' },
      error: null,
    });
    mockFrom.mockReturnValueOnce(orderChain).mockReturnValueOnce(cwChain);

    await expect(
      reassignCopywriter({ orderId: ORD_1, copywriterId: CW_1 }),
    ).rejects.toThrow('New');
  });
});

// в”Ђв”Ђ saveOrderContent в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

describe('saveOrderContent()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves content body without changing status', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CW_1, role: 'Copywriter' }),
    );
    const selectChain = makeChain({
      data: { id: ORD_1, status: 'In Progress', copywriter_id: CW_1 },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);

    await saveOrderContent({ orderId: ORD_1, body: 'Some content body' });

    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order.content_saved' }),
    );
    // No notification expected for autosave
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('throws FORBIDDEN when copywriter is not assigned', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CW_1, role: 'Copywriter' }),
    );
    const chain = makeChain({
      data: { id: ORD_1, status: 'In Progress', copywriter_id: CW_OTHER },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(
      saveOrderContent({ orderId: ORD_1, body: 'content' }),
    ).rejects.toThrow('not assigned');
  });

  it('throws VALIDATION when status is Content Sent', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CW_1, role: 'Copywriter' }),
    );
    const chain = makeChain({
      data: { id: ORD_1, status: 'Content Sent', copywriter_id: CW_1 },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(
      saveOrderContent({ orderId: ORD_1, body: 'content' }),
    ).rejects.toThrow('Content Sent');
  });
});

// в”Ђв”Ђ submitOrderContent в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

describe('submitOrderContent()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('transitions to Content Sent and notifies manager + client', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CW_1, role: 'Copywriter' }),
    );
    const body = 'A'.repeat(60);
    const selectChain = makeChain({
      data: {
        id: ORD_1,
        status: 'In Progress',
        copywriter_id: CW_1,
        content_body: body,
        manager_id: MGR_1,
        created_by_id: CLIENT_1,
      },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);

    await submitOrderContent({ orderId: ORD_1, body: 'A'.repeat(60) });

    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order.submit' }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: MGR_1,
        type: 'order.content_sent',
      }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: CLIENT_1,
        type: 'order.content_sent',
      }),
    );
  });

  it('throws VALIDATION when content is under 50 chars', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CW_1, role: 'Copywriter' }),
    );
    const chain = makeChain({
      data: {
        id: ORD_1,
        status: 'In Progress',
        copywriter_id: CW_1,
        content_body: 'short',
        manager_id: null,
        created_by_id: CLIENT_1,
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(submitOrderContent({ orderId: ORD_1, body: 'short' })).rejects.toThrow(
      '50 characters',
    );
  });

  it('throws VALIDATION when content is null', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CW_1, role: 'Copywriter' }),
    );
    const chain = makeChain({
      data: {
        id: ORD_1,
        status: 'In Progress',
        copywriter_id: CW_1,
        content_body: null,
        manager_id: null,
        created_by_id: CLIENT_1,
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(submitOrderContent({ orderId: ORD_1, body: '' })).rejects.toThrow(
      '50 characters',
    );
  });

  it('throws FORBIDDEN when not assigned copywriter', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CW_1, role: 'Copywriter' }),
    );
    const chain = makeChain({
      data: {
        id: ORD_1,
        status: 'In Progress',
        copywriter_id: CW_OTHER,
        content_body: 'A'.repeat(60),
        manager_id: null,
        created_by_id: CLIENT_1,
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(submitOrderContent({ orderId: ORD_1, body: 'A'.repeat(60) })).rejects.toThrow(
      'not assigned',
    );
  });

  it('succeeds when status is Needs changes (widened guard in M5)', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CW_1, role: 'Copywriter' }),
    );
    const selectChain = makeChain({
      data: {
        id: ORD_1,
        status: 'Needs changes',
        copywriter_id: CW_1,
        content_body: 'A'.repeat(60),
        manager_id: null,
        created_by_id: CLIENT_1,
      },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);

    await expect(
      submitOrderContent({ orderId: ORD_1, body: 'A'.repeat(60) }),
    ).resolves.toBeUndefined();
  });
});

// в”Ђв”Ђ approveOrder в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

describe('approveOrder()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('transitions Content Sent в†’ Content Approved and notifies manager + copywriter', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CLIENT_1, role: 'Client' }),
    );
    const orderData = {
      id: ORD_1,
      status: 'Content Sent',
      created_by_id: CLIENT_1,
      manager_id: MGR_1,
      copywriter_id: CW_1,
    };
    const selectChain = makeChain({ data: orderData, error: null });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);

    await approveOrder({ orderId: ORD_1 });

    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order.approved', entityId: ORD_1 }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: MGR_1,
        type: 'order.content_approved',
      }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: CW_1,
        type: 'order.content_approved',
      }),
    );
  });

  it('throws FORBIDDEN when caller is not Client', async () => {
    mockRequireRole.mockRejectedValueOnce(
      new Error('FORBIDDEN: requires role Client'),
    );
    await expect(approveOrder({ orderId: ORD_1 })).rejects.toThrow(
      'permission',
    );
  });

  it('throws FORBIDDEN when order belongs to another client', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CLIENT_1, role: 'Client' }),
    );
    const chain = makeChain({
      data: {
        id: ORD_1,
        status: 'Content Sent',
        created_by_id: CLIENT_2,
        manager_id: null,
        copywriter_id: null,
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(approveOrder({ orderId: ORD_1 })).rejects.toThrow(
      'own this order',
    );
  });

  it('throws VALIDATION when order is not Content Sent', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CLIENT_1, role: 'Client' }),
    );
    const chain = makeChain({
      data: {
        id: ORD_1,
        status: 'In Progress',
        created_by_id: CLIENT_1,
        manager_id: null,
        copywriter_id: null,
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(approveOrder({ orderId: ORD_1 })).rejects.toThrow(
      'In Progress',
    );
  });
});

// в”Ђв”Ђ rejectOrder в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

describe('rejectOrder()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a comment, transitions to Needs changes, notifies copywriter + manager', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CLIENT_1, role: 'Client' }),
    );
    const orderData = {
      id: ORD_1,
      status: 'Content Sent',
      created_by_id: CLIENT_1,
      manager_id: MGR_1,
      copywriter_id: CW_1,
    };
    const selectChain = makeChain({ data: orderData, error: null });
    const insertChain = makeChain({ data: [{ id: 'comment-1' }], error: null });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValue(updateChain);

    await rejectOrder({
      orderId: ORD_1,
      comment: 'This content needs significant improvement please.',
    });

    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order.rejected', entityId: ORD_1 }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: CW_1,
        type: 'order.needs_changes',
      }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: MGR_1,
        type: 'order.needs_changes',
      }),
    );
  });

  it('throws VALIDATION when comment is under 20 chars', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CLIENT_1, role: 'Client' }),
    );
    await expect(
      rejectOrder({ orderId: ORD_1, comment: 'Too short.' }),
    ).rejects.toThrow();
  });

  it('throws FORBIDDEN when caller is not Client', async () => {
    mockRequireRole.mockRejectedValueOnce(new Error('FORBIDDEN'));
    await expect(
      rejectOrder({
        orderId: ORD_1,
        comment: 'This content needs significant improvement.',
      }),
    ).rejects.toThrow('permission');
  });

  it('throws FORBIDDEN when order belongs to another client', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CLIENT_1, role: 'Client' }),
    );
    const chain = makeChain({
      data: {
        id: ORD_1,
        status: 'Content Sent',
        created_by_id: CLIENT_2,
        manager_id: null,
        copywriter_id: null,
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(
      rejectOrder({
        orderId: ORD_1,
        comment: 'This content needs significant improvement.',
      }),
    ).rejects.toThrow('own this order');
  });

  it('throws VALIDATION when status is not Content Sent', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CLIENT_1, role: 'Client' }),
    );
    const chain = makeChain({
      data: {
        id: ORD_1,
        status: 'New',
        created_by_id: CLIENT_1,
        manager_id: null,
        copywriter_id: null,
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(
      rejectOrder({
        orderId: ORD_1,
        comment: 'This content needs significant improvement.',
      }),
    ).rejects.toThrow('New');
  });
});

// в”Ђв”Ђ addComment в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

describe('addComment()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('allows Manager to comment without firing notifications', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );
    const orderData = {
      id: ORD_1,
      status: 'In Progress',
      created_by_id: CLIENT_1,
      manager_id: MGR_1,
      copywriter_id: CW_1,
    };
    const selectChain = makeChain({ data: orderData, error: null });
    const insertChain = makeChain({ data: [{ id: 'comment-1' }], error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(insertChain);

    await addComment({
      orderId: ORD_1,
      text: 'Please double-check the facts.',
    });

    // Per product: comments no longer generate notifications.
    expect(mockNotify).not.toHaveBeenCalled();
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order.comment_added' }),
    );
  });

  it('allows Client (order owner) to comment', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CLIENT_1, role: 'Client' }),
    );
    const orderData = {
      id: ORD_1,
      status: 'Content Sent',
      created_by_id: CLIENT_1,
      manager_id: MGR_1,
      copywriter_id: CW_1,
    };
    const selectChain = makeChain({ data: orderData, error: null });
    const insertChain = makeChain({ data: [{ id: 'comment-1' }], error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(insertChain);

    await addComment({ orderId: ORD_1, text: 'Looks good overall!' });

    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order.comment_added' }),
    );
  });

  it('throws FORBIDDEN when client does not own the order', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CLIENT_1, role: 'Client' }),
    );
    const chain = makeChain({
      data: {
        id: ORD_1,
        status: 'In Progress',
        created_by_id: CLIENT_2,
        manager_id: null,
        copywriter_id: null,
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(
      addComment({ orderId: ORD_1, text: 'Hello!' }),
    ).rejects.toThrow('access to this order');
  });

  it('throws FORBIDDEN when copywriter is not assigned to the order', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: CW_1, role: 'Copywriter' }),
    );
    const chain = makeChain({
      data: {
        id: ORD_1,
        status: 'In Progress',
        created_by_id: CLIENT_1,
        manager_id: MGR_1,
        copywriter_id: 'other-cw-id',
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(
      addComment({ orderId: ORD_1, text: 'Hello!' }),
    ).rejects.toThrow('not assigned to this order');
  });
});

// в”Ђв”Ђ publishOrder в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

describe('publishOrder()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('transitions Content Approved в†’ Published and snapshots sourcer payout', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );
    const SOURCER_ID = 'd0000002-0000-4000-8000-000000000002';
    const orderData = {
      id: ORD_1,
      status: 'Content Approved',
      site_id: 'site-1',
      created_by_id: CLIENT_1,
      manager_id: MGR_1,
      copywriter_id: CW_1,
    };
    const orderSelect = makeChain({ data: orderData, error: null });
    const siteSelect = makeChain({
      data: { sourcer_id: SOURCER_ID, sourcer_payout_cents: 4200 },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(orderSelect)
      .mockReturnValueOnce(siteSelect)
      .mockReturnValue(updateChain);

    await publishOrder({
      orderId: ORD_1,
      published_url: 'https://example.com/post',
      publish_date: tomorrowStr,
    });

    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'order.published',
        entityId: ORD_1,
        after: expect.objectContaining({ sourcer_payout_cents: 4200 }),
      }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: CLIENT_1,
        type: 'order.published',
      }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: CW_1, type: 'order.published' }),
    );
  });

  it('snapshots null payout when the site has no sourcer', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );
    const orderData = {
      id: ORD_1,
      status: 'Content Approved',
      site_id: 'site-1',
      created_by_id: CLIENT_1,
      manager_id: MGR_1,
      copywriter_id: CW_1,
    };
    const orderSelect = makeChain({ data: orderData, error: null });
    const siteSelect = makeChain({
      data: { sourcer_id: null, sourcer_payout_cents: 0 },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(orderSelect)
      .mockReturnValueOnce(siteSelect)
      .mockReturnValue(updateChain);

    await publishOrder({
      orderId: ORD_1,
      published_url: 'https://example.com/post',
      publish_date: tomorrowStr,
    });

    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'order.published',
        after: expect.objectContaining({ sourcer_payout_cents: null }),
      }),
    );
  });

  it('throws VALIDATION when URL is not HTTPS', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );
    await expect(
      publishOrder({
        orderId: ORD_1,
        published_url: 'http://example.com/post',
        publish_date: tomorrowStr,
      }),
    ).rejects.toThrow();
  });

  it('throws FORBIDDEN when caller is not Manager/Admin', async () => {
    mockRequireRole.mockRejectedValueOnce(new Error('FORBIDDEN'));
    await expect(
      publishOrder({
        orderId: ORD_1,
        published_url: 'https://example.com/post',
        publish_date: tomorrowStr,
      }),
    ).rejects.toThrow('permission');
  });

  it('throws VALIDATION when order is not Content Approved', async () => {
    mockRequireRole.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );
    const chain = makeChain({
      data: {
        id: ORD_1,
        status: 'Content Sent',
        site_id: 'site-1',
        created_by_id: CLIENT_1,
        manager_id: MGR_1,
        copywriter_id: CW_1,
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(
      publishOrder({
        orderId: ORD_1,
        published_url: 'https://example.com/post',
        publish_date: tomorrowStr,
      }),
    ).rejects.toThrow('Content Sent');
  });
});

// в”Ђв”Ђ fetchOrdersColumn в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

describe('fetchOrdersColumn()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchOrdersList.mockResolvedValue({ rows: [], total: 0 });
    mockFetchUsersByIds.mockResolvedValue([]);
  });

  it('Client sees only own orders (createdById scoped to actor)', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: CLIENT_1, role: 'Client' }),
    );
    await fetchOrdersColumn({
      status: 'New',
      page: 1,
      pageSize: 25,
      filters: {},
    });
    expect(mockFetchOrdersList).toHaveBeenCalledWith(
      expect.objectContaining({
        createdById: CLIENT_1,
        status: 'New',
        page: 1,
        pageSize: 25,
        excludeDisabledCreators: true,
      }),
    );
    const call = mockFetchOrdersList.mock.calls[0][0];
    expect(call.copywriterId).toBeUndefined();
    expect(call.unassigned).toBeFalsy();
  });

  it('Manager passes copywriterId, search, and unassigned through verbatim', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );
    await fetchOrdersColumn({
      status: 'In Progress',
      page: 2,
      pageSize: 25,
      filters: { copywriterId: CW_1, search: 'example.com', unassigned: true },
    });
    expect(mockFetchOrdersList).toHaveBeenCalledWith(
      expect.objectContaining({
        copywriterId: CW_1,
        search: 'example.com',
        unassigned: true,
        status: 'In Progress',
        page: 2,
        pageSize: 25,
      }),
    );
    const call = mockFetchOrdersList.mock.calls[0][0];
    expect(call.createdById).toBeUndefined();
  });

  it('Admin passes filters through verbatim and is not createdById-scoped', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: 'admin-1', role: 'Admin' }),
    );
    await fetchOrdersColumn({
      status: 'Published',
      page: 1,
      pageSize: 25,
      filters: { copywriterId: CW_1 },
    });
    const call = mockFetchOrdersList.mock.calls[0][0];
    expect(call.createdById).toBeUndefined();
    expect(call.copywriterId).toBe(CW_1);
  });

  it('Sourcer is forbidden', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser({ role: 'Sourcer' }));
    await expect(
      fetchOrdersColumn({ status: 'New', page: 1, pageSize: 25, filters: {} }),
    ).rejects.toThrow(/permission|FORBIDDEN/i);
  });

  it('Copywriter is forbidden', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser({ role: 'Copywriter' }));
    await expect(
      fetchOrdersColumn({ status: 'New', page: 1, pageSize: 25, filters: {} }),
    ).rejects.toThrow(/permission|FORBIDDEN/i);
  });

  it('rejects status not in KANBAN_COLUMNS (e.g. Completed)', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );
    await expect(
      fetchOrdersColumn({
        status: 'Completed',
        page: 1,
        pageSize: 25,
        filters: {},
      }),
    ).rejects.toThrow(/status/i);
    expect(mockFetchOrdersList).not.toHaveBeenCalled();
  });

  it('enriches rows with copywriter/manager names', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );
    mockFetchOrdersList.mockResolvedValueOnce({
      rows: [
        {
          id: ORD_1,
          site_domain: 'example.com',
          status: 'In Progress',
          price_cents: 5000,
          publish_date: '2026-06-01',
          published_at: null,
          created_at: '2026-05-01T00:00:00Z',
          created_by_id: CLIENT_1,
          copywriter_id: CW_1,
          manager_id: MGR_1,
          sourcer_payout_cents: null,
          sourcer_paid_at: null,
        },
      ],
      total: 1,
    });
    mockFetchUsersByIds.mockResolvedValueOnce([
      {
        id: CW_1,
        first_name: 'Carla',
        last_name: 'Writer',
        role: 'Copywriter',
        status: 'ACTIVE',
      },
      {
        id: MGR_1,
        first_name: 'Mark',
        last_name: 'Manager',
        role: 'Manager',
        status: 'ACTIVE',
      },
    ]);

    const result = await fetchOrdersColumn({
      status: 'In Progress',
      page: 1,
      pageSize: 25,
      filters: {},
    });

    expect(result.total).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: ORD_1,
      site_domain: 'example.com',
      copywriter: { first_name: 'Carla', last_name: 'Writer' },
      manager: { first_name: 'Mark', last_name: 'Manager' },
    });
    expect(mockFetchUsersByIds).toHaveBeenCalledWith(
      expect.arrayContaining([CW_1, MGR_1, CLIENT_1]),
    );
  });

  it('propagates total from fetchOrdersList unchanged', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );
    mockFetchOrdersList.mockResolvedValueOnce({ rows: [], total: 142 });
    const result = await fetchOrdersColumn({
      status: 'New',
      page: 1,
      pageSize: 25,
      filters: {},
    });
    expect(result.total).toBe(142);
    expect(result.rows).toEqual([]);
  });
});
