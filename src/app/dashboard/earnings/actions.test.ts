import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserRow } from '@/lib/features/auth';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

const mockRecordAudit = vi.fn();
const mockNotify = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('@/lib/features/audit', () => ({ recordAudit: mockRecordAudit }));
vi.mock('@/lib/features/notify', () => ({ notify: mockNotify }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

const makeUser = (overrides: Partial<UserRow> = {}): UserRow => ({
  id: 'admin-1',
  email: 'admin@test.com',
  role: 'Admin',
  status: 'ACTIVE',
  first_name: 'A',
  last_name: 'D',
  manager_id: null,
  created_by_id: null,
  invited_at: null,
  disabled_reason: null,
  avatar: null,
  ...overrides,
});

const mockRequireRole = vi.fn(async () => makeUser());

vi.mock('@/lib/features/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/features/auth')>();
  return { ...actual, requireRole: mockRequireRole };
});

const { markOrdersPayoutPaid, setOrderPayoutPaid } = await import('./actions');

// Fluent thenable chain: any chained method returns the chain; awaiting it resolves to `result`.
function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'update', 'in', 'is', 'not', 'eq'];
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  // make the chain awaitable: PromiseLike that resolves to `result`
  (
    chain as {
      then: (onFulfilled: (v: unknown) => unknown) => Promise<unknown>;
    }
  ).then = (onFulfilled) => Promise.resolve(result).then(onFulfilled);
  return chain;
}

const ORD_1 = 'a0000001-0000-4000-8000-000000000001';
const ORD_2 = 'a0000002-0000-4000-8000-000000000002';
const SITE_1 = 'b0000001-0000-4000-8000-000000000001';
const SITE_2 = 'b0000002-0000-4000-8000-000000000002';
const SOURCER_1 = 'c0000001-0000-4000-8000-000000000001';
const SOURCER_2 = 'c0000002-0000-4000-8000-000000000002';

describe('markOrdersPayoutPaid()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks eligible rows paid, records audit, notifies sourcers, and revalidates', async () => {
    const rows = [
      {
        id: ORD_1,
        site_id: SITE_1,
        sourcer_payout_cents: 4200,
        sourcer_paid_at: null,
        sites: { sourcer_id: SOURCER_1 },
      },
      {
        id: ORD_2,
        site_id: SITE_2,
        sourcer_payout_cents: 3000,
        sourcer_paid_at: null,
        sites: { sourcer_id: SOURCER_2 },
      },
    ];
    const selectChain = makeChain({ data: rows, error: null });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain);

    const result = await markOrdersPayoutPaid({
      orderIds: [ORD_1, ORD_2],
      payoutReference: 'PAY-2026-05',
    });

    expect(result).toEqual({ success: true, data: { updated: 2 } });
    expect(mockRecordAudit).toHaveBeenCalledTimes(2);
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'order.payout_marked_paid',
        entityId: ORD_1,
        after: expect.objectContaining({
          sourcer_payout_reference: 'PAY-2026-05',
          sourcer_payout_cents: 4200,
        }),
      }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: SOURCER_1,
        type: 'order.payout_paid',
        payload: expect.objectContaining({
          orderId: ORD_1,
          amount_cents: 4200,
          payout_reference: 'PAY-2026-05',
        }),
      }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: SOURCER_2 }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/earnings');
  });

  it('filters out rows whose site has no sourcer', async () => {
    const rows = [
      {
        id: ORD_1,
        site_id: SITE_1,
        sourcer_payout_cents: 4200,
        sourcer_paid_at: null,
        sites: { sourcer_id: null },
      },
      {
        id: ORD_2,
        site_id: SITE_2,
        sourcer_payout_cents: 3000,
        sourcer_paid_at: null,
        sites: { sourcer_id: SOURCER_2 },
      },
    ];
    const selectChain = makeChain({ data: rows, error: null });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain);

    const result = await markOrdersPayoutPaid({
      orderIds: [ORD_1, ORD_2],
      payoutReference: 'PAY-X',
    });

    expect(result).toEqual({ success: true, data: { updated: 1 } });
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: SOURCER_2 }),
    );
  });

  it('returns { updated: 0 } and does not update/audit/notify when nothing is eligible', async () => {
    const selectChain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValueOnce(selectChain);

    const result = await markOrdersPayoutPaid({
      orderIds: [ORD_1],
      payoutReference: 'PAY-X',
    });

    expect(result).toEqual({ success: true, data: { updated: 0 } });
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockRecordAudit).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('returns FORBIDDEN when caller is not Admin', async () => {
    mockRequireRole.mockRejectedValueOnce(
      new Error('FORBIDDEN: requires role Admin'),
    );
    const result = await markOrdersPayoutPaid({
      orderIds: [ORD_1],
      payoutReference: 'PAY-X',
    });
    expect(result).toEqual({
      success: false,
      code: 'FORBIDDEN',
      message: expect.stringMatching(/permission/i),
    });
  });

  it('returns VALIDATION when orderIds is empty', async () => {
    const result = await markOrdersPayoutPaid({
      orderIds: [],
      payoutReference: 'PAY-X',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe('VALIDATION');
  });

  it('returns VALIDATION when payoutReference is too short', async () => {
    const result = await markOrdersPayoutPaid({
      orderIds: [ORD_1],
      payoutReference: 'AB',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe('VALIDATION');
  });

  it('returns error when fetch query errors', async () => {
    const selectChain = makeChain({
      data: null,
      error: { message: 'fetch boom' },
    });
    mockFrom.mockReturnValueOnce(selectChain);

    const result = await markOrdersPayoutPaid({
      orderIds: [ORD_1],
      payoutReference: 'PAY-X',
    });
    expect(result).toEqual({
      success: false,
      code: 'UNKNOWN',
      message: 'fetch boom',
    });
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });

  it('returns error when update query errors', async () => {
    const rows = [
      {
        id: ORD_1,
        site_id: SITE_1,
        sourcer_payout_cents: 4200,
        sourcer_paid_at: null,
        sites: { sourcer_id: SOURCER_1 },
      },
    ];
    const selectChain = makeChain({ data: rows, error: null });
    const updateChain = makeChain({
      data: null,
      error: { message: 'update boom' },
    });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain);

    const result = await markOrdersPayoutPaid({
      orderIds: [ORD_1],
      payoutReference: 'PAY-X',
    });
    expect(result).toEqual({
      success: false,
      code: 'UNKNOWN',
      message: 'update boom',
    });
    expect(mockRecordAudit).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });
});

describe('setOrderPayoutPaid()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks a single order paid, records audit, notifies sourcer, and revalidates', async () => {
    const selectChain = makeChain({
      data: {
        id: ORD_1,
        sourcer_payout_cents: 4200,
        sourcer_paid_at: null,
        sourcer_payout_reference: null,
        sites: { sourcer_id: SOURCER_1 },
      },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain);

    const res = await setOrderPayoutPaid({
      orderId: ORD_1,
      paid: true,
      payoutReference: 'PAY-2026-06',
    });

    expect(res).toEqual({ success: true, data: { paid: true } });
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'order.payout_marked_paid',
        entityId: ORD_1,
        after: expect.objectContaining({
          sourcer_payout_reference: 'PAY-2026-06',
          sourcer_payout_cents: 4200,
        }),
      }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: SOURCER_1,
        type: 'order.payout_paid',
        payload: expect.objectContaining({
          orderId: ORD_1,
          amount_cents: 4200,
          payout_reference: 'PAY-2026-06',
        }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/earnings');
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      `/dashboard/orders/${ORD_1}`,
    );
  });

  it('clears paid timestamp/reference when paid=false; audits unpaid; does not notify', async () => {
    const selectChain = makeChain({
      data: {
        id: ORD_1,
        sourcer_payout_cents: 4200,
        sourcer_paid_at: '2026-05-01T00:00:00Z',
        sourcer_payout_reference: 'PAY-OLD',
        sites: { sourcer_id: SOURCER_1 },
      },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain);

    const res = await setOrderPayoutPaid({ orderId: ORD_1, paid: false });

    expect(res).toEqual({ success: true, data: { paid: false } });
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'order.payout_marked_unpaid',
        entityId: ORD_1,
        before: expect.objectContaining({
          sourcer_paid_at: '2026-05-01T00:00:00Z',
          sourcer_payout_reference: 'PAY-OLD',
        }),
        after: expect.objectContaining({
          sourcer_paid_at: null,
          sourcer_payout_reference: null,
        }),
      }),
    );
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('returns FORBIDDEN when caller is not Admin', async () => {
    mockRequireRole.mockRejectedValueOnce(
      new Error('FORBIDDEN: requires role Admin'),
    );
    const res = await setOrderPayoutPaid({
      orderId: ORD_1,
      paid: true,
      payoutReference: 'PAY-X',
    });
    expect(res).toEqual({
      success: false,
      code: 'FORBIDDEN',
      message: expect.stringMatching(/permission/i),
    });
  });

  it('returns VALIDATION when paid=true and payoutReference is too short', async () => {
    const res = await setOrderPayoutPaid({
      orderId: ORD_1,
      paid: true,
      payoutReference: 'AB',
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.code).toBe('VALIDATION');
  });

  it('returns NOT_FOUND when order does not exist', async () => {
    const selectChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain);
    const res = await setOrderPayoutPaid({
      orderId: ORD_1,
      paid: true,
      payoutReference: 'PAY-X',
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.code).toBe('NOT_FOUND');
  });

  it('rejects orders with no sourcer or no payout amount', async () => {
    const selectChain = makeChain({
      data: {
        id: ORD_1,
        sourcer_payout_cents: null,
        sourcer_paid_at: null,
        sourcer_payout_reference: null,
        sites: { sourcer_id: SOURCER_1 },
      },
      error: null,
    });
    mockFrom.mockReturnValueOnce(selectChain);

    const res = await setOrderPayoutPaid({
      orderId: ORD_1,
      paid: true,
      payoutReference: 'PAY-X',
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.code).toBe('VALIDATION');
  });

});

describe('markOrdersPayoutPaid() — extra', () => {
  beforeEach(() => vi.clearAllMocks());

  it('handles `sites` returned as an array (treats first entry as the relation)', async () => {
    const rows = [
      {
        id: ORD_1,
        site_id: SITE_1,
        sourcer_payout_cents: 4200,
        sourcer_paid_at: null,
        sites: [{ sourcer_id: SOURCER_1 }],
      },
    ];
    const selectChain = makeChain({ data: rows, error: null });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain);

    const result = await markOrdersPayoutPaid({
      orderIds: [ORD_1],
      payoutReference: 'PAY-X',
    });

    expect(result).toEqual({ success: true, data: { updated: 1 } });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: SOURCER_1 }),
    );
  });
});
