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

// ── Import M5 actions after mocks ─────────────────────────────────────────────

const { approveOrder, rejectOrder, addComment, publishOrder, submitOrderContent } = await import('./actions');

// ── Fluent Supabase stub builder ───────────────────────────────────────────────

type ChainResult = { data: unknown; error: unknown };

function makeChain(result: ChainResult) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'neq', 'maybeSingle', 'single', 'order', 'limit'];
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  (chain['single'] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  (chain['maybeSingle'] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  // make insert/update chains also resolve when awaited directly
  (chain['insert'] as ReturnType<typeof vi.fn>).mockReturnValue({ ...chain, then: undefined });
  return chain;
}

// UUIDs that pass Zod v4 uuid validation
const ORD_1   = 'a0000001-0000-4000-8000-000000000001';
const CW_1    = 'a0000002-0000-4000-8000-000000000002';
const MGR_1   = 'a0000006-0000-4000-8000-000000000006';
const CLIENT_1 = 'a0000007-0000-4000-8000-000000000007';
const CLIENT_2 = 'a0000008-0000-4000-8000-000000000008';

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

// ── approveOrder ───────────────────────────────────────────────────────────────

describe('approveOrder()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('transitions Content Sent → Content Approved and notifies manager + copywriter', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CLIENT_1, role: 'Client' }));
    const orderData = {
      id: ORD_1, status: 'Content Sent', created_by_id: CLIENT_1,
      manager_id: MGR_1, copywriter_id: CW_1,
    };
    const selectChain = makeChain({ data: orderData, error: null });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);

    await approveOrder({ orderId: ORD_1 });

    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order.approved', entityId: ORD_1 }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: MGR_1, type: 'order.content_approved' }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: CW_1, type: 'order.content_approved' }),
    );
  });

  it('throws FORBIDDEN when caller is not Client', async () => {
    mockRequireRole.mockRejectedValueOnce(new Error('FORBIDDEN: requires role Client'));
    await expect(approveOrder({ orderId: ORD_1 })).rejects.toThrow('permission');
  });

  it('throws FORBIDDEN when order belongs to another client', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CLIENT_1, role: 'Client' }));
    const chain = makeChain({
      data: { id: ORD_1, status: 'Content Sent', created_by_id: CLIENT_2, manager_id: null, copywriter_id: null },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(approveOrder({ orderId: ORD_1 })).rejects.toThrow('own this order');
  });

  it('throws VALIDATION when order is not Content Sent', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CLIENT_1, role: 'Client' }));
    const chain = makeChain({
      data: { id: ORD_1, status: 'In Progress', created_by_id: CLIENT_1, manager_id: null, copywriter_id: null },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(approveOrder({ orderId: ORD_1 })).rejects.toThrow('In Progress');
  });
});

// ── rejectOrder ────────────────────────────────────────────────────────────────

describe('rejectOrder()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a comment, transitions to Needs changes, notifies copywriter + manager', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CLIENT_1, role: 'Client' }));
    const orderData = {
      id: ORD_1, status: 'Content Sent', created_by_id: CLIENT_1,
      manager_id: MGR_1, copywriter_id: CW_1,
    };
    const selectChain = makeChain({ data: orderData, error: null });
    const insertChain = makeChain({ data: [{ id: 'comment-1' }], error: null });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValue(updateChain);

    await rejectOrder({ orderId: ORD_1, comment: 'This content needs significant improvement please.' });

    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order.rejected', entityId: ORD_1 }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: CW_1, type: 'order.needs_changes' }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: MGR_1, type: 'order.needs_changes' }),
    );
  });

  it('throws VALIDATION when comment is under 20 chars', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CLIENT_1, role: 'Client' }));
    await expect(
      rejectOrder({ orderId: ORD_1, comment: 'Too short.' }),
    ).rejects.toThrow();
  });

  it('throws FORBIDDEN when caller is not Client', async () => {
    mockRequireRole.mockRejectedValueOnce(new Error('FORBIDDEN'));
    await expect(
      rejectOrder({ orderId: ORD_1, comment: 'This content needs significant improvement.' }),
    ).rejects.toThrow('permission');
  });

  it('throws FORBIDDEN when order belongs to another client', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CLIENT_1, role: 'Client' }));
    const chain = makeChain({
      data: { id: ORD_1, status: 'Content Sent', created_by_id: CLIENT_2, manager_id: null, copywriter_id: null },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(
      rejectOrder({ orderId: ORD_1, comment: 'This content needs significant improvement.' }),
    ).rejects.toThrow('own this order');
  });

  it('throws VALIDATION when status is not Content Sent', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CLIENT_1, role: 'Client' }));
    const chain = makeChain({
      data: { id: ORD_1, status: 'New', created_by_id: CLIENT_1, manager_id: null, copywriter_id: null },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(
      rejectOrder({ orderId: ORD_1, comment: 'This content needs significant improvement.' }),
    ).rejects.toThrow('New');
  });
});

// ── addComment ─────────────────────────────────────────────────────────────────

describe('addComment()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('allows Manager to comment and notifies client + copywriter', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: MGR_1, role: 'Manager' }));
    const orderData = {
      id: ORD_1, status: 'In Progress', created_by_id: CLIENT_1,
      manager_id: MGR_1, copywriter_id: CW_1,
    };
    const selectChain = makeChain({ data: orderData, error: null });
    const insertChain = makeChain({ data: [{ id: 'comment-1' }], error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(insertChain);

    await addComment({ orderId: ORD_1, text: 'Please double-check the facts.' });

    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: CLIENT_1 }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: CW_1 }),
    );
  });

  it('allows Client (order owner) to comment', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CLIENT_1, role: 'Client' }));
    const orderData = {
      id: ORD_1, status: 'Content Sent', created_by_id: CLIENT_1,
      manager_id: MGR_1, copywriter_id: CW_1,
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
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CLIENT_1, role: 'Client' }));
    const chain = makeChain({
      data: { id: ORD_1, status: 'In Progress', created_by_id: CLIENT_2, manager_id: null, copywriter_id: null },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(addComment({ orderId: ORD_1, text: 'Hello!' })).rejects.toThrow('access to this order');
  });

  it('throws FORBIDDEN when copywriter is not assigned to the order', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CW_1, role: 'Copywriter' }));
    const chain = makeChain({
      data: { id: ORD_1, status: 'In Progress', created_by_id: CLIENT_1, manager_id: MGR_1, copywriter_id: 'other-cw-id' },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(addComment({ orderId: ORD_1, text: 'Hello!' })).rejects.toThrow('not assigned to this order');
  });
});

// ── publishOrder ───────────────────────────────────────────────────────────────

describe('publishOrder()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('transitions Content Approved → Published and sets billing_month', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: MGR_1, role: 'Manager' }));
    const orderData = {
      id: ORD_1, status: 'Content Approved', created_by_id: CLIENT_1,
      manager_id: MGR_1, copywriter_id: CW_1,
    };
    const selectChain = makeChain({ data: orderData, error: null });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);

    await publishOrder({
      orderId: ORD_1,
      published_url: 'https://example.com/post',
      publish_date: tomorrowStr,
    });

    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order.published', entityId: ORD_1 }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: CLIENT_1, type: 'order.published' }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: CW_1, type: 'order.published' }),
    );
  });

  it('throws VALIDATION when URL is not HTTPS', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: MGR_1, role: 'Manager' }));
    await expect(
      publishOrder({ orderId: ORD_1, published_url: 'http://example.com/post', publish_date: tomorrowStr }),
    ).rejects.toThrow();
  });

  it('throws FORBIDDEN when caller is not Manager/Admin', async () => {
    mockRequireRole.mockRejectedValueOnce(new Error('FORBIDDEN'));
    await expect(
      publishOrder({ orderId: ORD_1, published_url: 'https://example.com/post', publish_date: tomorrowStr }),
    ).rejects.toThrow('permission');
  });

  it('throws VALIDATION when order is not Content Approved', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: MGR_1, role: 'Manager' }));
    const chain = makeChain({
      data: { id: ORD_1, status: 'Content Sent', created_by_id: CLIENT_1, manager_id: MGR_1, copywriter_id: CW_1 },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(
      publishOrder({ orderId: ORD_1, published_url: 'https://example.com/post', publish_date: tomorrowStr }),
    ).rejects.toThrow('Content Sent');
  });
});

// ── submitOrderContent (widened guard regression) ──────────────────────────────

describe('submitOrderContent() — Needs changes regression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('succeeds when status is Needs changes (widened guard)', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: CW_1, role: 'Copywriter' }));
    const body = 'B'.repeat(60);
    const selectChain = makeChain({
      data: { id: ORD_1, status: 'Needs changes', copywriter_id: CW_1, content_body: body, manager_id: MGR_1, created_by_id: CLIENT_1 },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);

    await expect(submitOrderContent({ orderId: ORD_1 })).resolves.toBeUndefined();

    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order.submit' }),
    );
  });
});
