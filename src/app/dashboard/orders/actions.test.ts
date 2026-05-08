import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserRow } from '@/lib/auth';

// ── Shared mock state ──────────────────────────────────────────────────────────

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

vi.mock('@/lib/audit', () => ({ recordAudit: mockRecordAudit }));
vi.mock('@/lib/notify', () => ({ notify: mockNotify }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

// ── Auth mock helpers ──────────────────────────────────────────────────────────

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

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return { ...actual, requireRole: mockRequireRole };
});

// ── Import actions after mocks ─────────────────────────────────────────────────

const {
  editOrderPublishDate,
  cancelOrder,
  assignCopywriter,
  reassignCopywriter,
  saveOrderContent,
  submitOrderContent,
} = await import('./actions');

// ── Fluent Supabase stub builder ───────────────────────────────────────────────

type ChainResult = { data: unknown; error: unknown; count?: number };

function makeChain(result: ChainResult) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'maybeSingle', 'single', 'order'];
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

// ── editOrderPublishDate ───────────────────────────────────────────────────────

describe('editOrderPublishDate()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates publish_date for own New order', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CLIENT_1, role: 'Client' }));
    const selectChain = makeChain({ data: { id: ORD_1, status: 'New', created_by_id: CLIENT_1, manager_id: null }, error: null });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);

    await editOrderPublishDate({ orderId: ORD_1, publish_date: tomorrowStr });

    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order.publish_date_changed', entityId: ORD_1 }),
    );
  });

  it('throws FORBIDDEN when caller is not Client', async () => {
    mockRequireRole.mockRejectedValueOnce(new Error('FORBIDDEN: requires role Client'));
    await expect(editOrderPublishDate({ orderId: ORD_1, publish_date: tomorrowStr })).rejects.toThrow('permission');
  });

  it('throws FORBIDDEN when order belongs to another client', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CLIENT_1, role: 'Client' }));
    const chain = makeChain({ data: { id: ORD_1, status: 'New', created_by_id: CLIENT_2, manager_id: null }, error: null });
    mockFrom.mockReturnValue(chain);

    await expect(editOrderPublishDate({ orderId: ORD_1, publish_date: tomorrowStr })).rejects.toThrow('own this order');
  });

  it('throws VALIDATION when order is not New', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CLIENT_1, role: 'Client' }));
    const chain = makeChain({ data: { id: ORD_1, status: 'In Progress', created_by_id: CLIENT_1, manager_id: null }, error: null });
    mockFrom.mockReturnValue(chain);

    await expect(editOrderPublishDate({ orderId: ORD_1, publish_date: tomorrowStr })).rejects.toThrow('In Progress');
  });

  it('throws VALIDATION for past date', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CLIENT_1, role: 'Client' }));
    await expect(
      editOrderPublishDate({ orderId: ORD_1, publish_date: '2020-01-01' }),
    ).rejects.toThrow('today or later');
  });
});

// ── cancelOrder ────────────────────────────────────────────────────────────────

describe('cancelOrder()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cancels a New order and notifies manager', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CLIENT_1, role: 'Client' }));
    const selectChain = makeChain({ data: { id: ORD_1, status: 'New', created_by_id: CLIENT_1, manager_id: MGR_1 }, error: null });
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
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CLIENT_1, role: 'Client' }));
    const selectChain = makeChain({ data: { id: ORD_1, status: 'New', created_by_id: CLIENT_1, manager_id: null }, error: null });
    const updateChain = makeChain({ data: null, error: null });
    const managersResult = { data: [{ id: MGR_1 }, { id: 'a0000009-0000-4000-8000-000000000009' }], error: null };
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
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CLIENT_1, role: 'Client' }));
    const chain = makeChain({ data: { id: ORD_1, status: 'In Progress', created_by_id: CLIENT_1, manager_id: null }, error: null });
    mockFrom.mockReturnValue(chain);

    await expect(cancelOrder({ orderId: ORD_1 })).rejects.toThrow('In Progress');
  });
});

// ── assignCopywriter ───────────────────────────────────────────────────────────

describe('assignCopywriter()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('assigns copywriter and transitions to In Progress', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: MGR_1, role: 'Manager' }));

    const orderChain = makeChain({ data: { id: ORD_1, status: 'New', created_by_id: CLIENT_1, manager_id: null }, error: null });
    const cwChain = makeChain({ data: { id: CW_1, role: 'Copywriter', status: 'ACTIVE' }, error: null });
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
      expect.objectContaining({ recipientId: CLIENT_1, type: 'order.in_progress' }),
    );
  });

  it('throws FORBIDDEN when caller is not Manager/Admin', async () => {
    mockRequireRole.mockRejectedValueOnce(new Error('FORBIDDEN: requires role Manager or Admin'));
    await expect(assignCopywriter({ orderId: ORD_1, copywriterId: CW_1 })).rejects.toThrow('permission');
  });

  it('throws VALIDATION when order is not New', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: MGR_1, role: 'Manager' }));
    const orderChain = makeChain({ data: { id: ORD_1, status: 'In Progress', created_by_id: CLIENT_1, manager_id: null }, error: null });
    const cwChain = makeChain({ data: { id: CW_1, role: 'Copywriter', status: 'ACTIVE' }, error: null });
    mockFrom.mockReturnValueOnce(orderChain).mockReturnValueOnce(cwChain);

    await expect(assignCopywriter({ orderId: ORD_1, copywriterId: CW_1 })).rejects.toThrow('In Progress');
  });

  it('throws VALIDATION when copywriter is DISABLED', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: MGR_1, role: 'Manager' }));
    const orderChain = makeChain({ data: { id: ORD_1, status: 'New', created_by_id: CLIENT_1, manager_id: null }, error: null });
    const cwChain = makeChain({ data: { id: CW_1, role: 'Copywriter', status: 'DISABLED' }, error: null });
    mockFrom.mockReturnValueOnce(orderChain).mockReturnValueOnce(cwChain);

    await expect(assignCopywriter({ orderId: ORD_1, copywriterId: CW_1 })).rejects.toThrow('not active');
  });
});

// ── reassignCopywriter ─────────────────────────────────────────────────────────

describe('reassignCopywriter()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reassigns and notifies both old and new copywriter', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: MGR_1, role: 'Manager' }));
    const orderChain = makeChain({ data: { id: ORD_1, status: 'In Progress', copywriter_id: CW_OLD, created_by_id: CLIENT_1 }, error: null });
    const cwChain = makeChain({ data: { id: CW_NEW, role: 'Copywriter', status: 'ACTIVE' }, error: null });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(orderChain).mockReturnValueOnce(cwChain).mockReturnValue(updateChain);

    await reassignCopywriter({ orderId: ORD_1, copywriterId: CW_NEW });

    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: CW_NEW, type: 'order.assigned' }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: CW_OLD, type: 'order.reassigned_away' }),
    );
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order.reassign' }),
    );
  });

  it('throws VALIDATION when order is New (cannot reassign)', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: MGR_1, role: 'Manager' }));
    const orderChain = makeChain({ data: { id: ORD_1, status: 'New', copywriter_id: null, created_by_id: CLIENT_1 }, error: null });
    const cwChain = makeChain({ data: { id: CW_1, role: 'Copywriter', status: 'ACTIVE' }, error: null });
    mockFrom.mockReturnValueOnce(orderChain).mockReturnValueOnce(cwChain);

    await expect(reassignCopywriter({ orderId: ORD_1, copywriterId: CW_1 })).rejects.toThrow('New');
  });
});

// ── saveOrderContent ───────────────────────────────────────────────────────────

describe('saveOrderContent()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves content body without changing status', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CW_1, role: 'Copywriter' }));
    const selectChain = makeChain({ data: { id: ORD_1, status: 'In Progress', copywriter_id: CW_1 }, error: null });
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
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CW_1, role: 'Copywriter' }));
    const chain = makeChain({ data: { id: ORD_1, status: 'In Progress', copywriter_id: CW_OTHER }, error: null });
    mockFrom.mockReturnValue(chain);

    await expect(saveOrderContent({ orderId: ORD_1, body: 'content' })).rejects.toThrow('not assigned');
  });

  it('throws VALIDATION when status is Content Sent', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CW_1, role: 'Copywriter' }));
    const chain = makeChain({ data: { id: ORD_1, status: 'Content Sent', copywriter_id: CW_1 }, error: null });
    mockFrom.mockReturnValue(chain);

    await expect(saveOrderContent({ orderId: ORD_1, body: 'content' })).rejects.toThrow('Content Sent');
  });
});

// ── submitOrderContent ─────────────────────────────────────────────────────────

describe('submitOrderContent()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('transitions to Content Sent and notifies manager + client', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CW_1, role: 'Copywriter' }));
    const body = 'A'.repeat(60);
    const selectChain = makeChain({
      data: { id: ORD_1, status: 'In Progress', copywriter_id: CW_1, content_body: body, manager_id: MGR_1, created_by_id: CLIENT_1 },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);

    await submitOrderContent({ orderId: ORD_1 });

    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order.submit' }),
    );
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ recipientId: MGR_1, type: 'order.content_sent' }));
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ recipientId: CLIENT_1, type: 'order.content_sent' }));
  });

  it('throws VALIDATION when content is under 50 chars', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CW_1, role: 'Copywriter' }));
    const chain = makeChain({
      data: { id: ORD_1, status: 'In Progress', copywriter_id: CW_1, content_body: 'short', manager_id: null, created_by_id: CLIENT_1 },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(submitOrderContent({ orderId: ORD_1 })).rejects.toThrow('50 characters');
  });

  it('throws VALIDATION when content is null', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CW_1, role: 'Copywriter' }));
    const chain = makeChain({
      data: { id: ORD_1, status: 'In Progress', copywriter_id: CW_1, content_body: null, manager_id: null, created_by_id: CLIENT_1 },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(submitOrderContent({ orderId: ORD_1 })).rejects.toThrow('50 characters');
  });

  it('throws FORBIDDEN when not assigned copywriter', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CW_1, role: 'Copywriter' }));
    const chain = makeChain({
      data: { id: ORD_1, status: 'In Progress', copywriter_id: CW_OTHER, content_body: 'A'.repeat(60), manager_id: null, created_by_id: CLIENT_1 },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(submitOrderContent({ orderId: ORD_1 })).rejects.toThrow('not assigned');
  });

  it('succeeds when status is Needs changes (widened guard in M5)', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CW_1, role: 'Copywriter' }));
    const selectChain = makeChain({
      data: { id: ORD_1, status: 'Needs changes', copywriter_id: CW_1, content_body: 'A'.repeat(60), manager_id: null, created_by_id: CLIENT_1 },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);

    await expect(submitOrderContent({ orderId: ORD_1 })).resolves.toBeUndefined();
  });
});
