import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserRow } from '@/lib/features/auth';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

const mockRecordAudit = vi.fn();
const mockNotify = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('@/lib/audit', () => ({ recordAudit: mockRecordAudit }));
vi.mock('@/lib/notify', () => ({ notify: mockNotify }));
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

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/features/auth')>();
  return { ...actual, requireRole: mockRequireRole };
});

const { markOrdersPayoutPaid } = await import('./actions');

// Fluent thenable chain: any chained method returns the chain; awaiting it resolves to `result`.
function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'update', 'in', 'is', 'not', 'eq'];
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
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

    expect(result).toEqual({ updated: 2 });
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

    expect(result).toEqual({ updated: 1 });
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

    expect(result).toEqual({ updated: 0 });
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockRecordAudit).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('throws FORBIDDEN when caller is not Admin', async () => {
    mockRequireRole.mockRejectedValueOnce(
      new Error('FORBIDDEN: requires role Admin'),
    );
    await expect(
      markOrdersPayoutPaid({ orderIds: [ORD_1], payoutReference: 'PAY-X' }),
    ).rejects.toThrow('permission');
  });

  it('throws VALIDATION when orderIds is empty', async () => {
    await expect(
      markOrdersPayoutPaid({ orderIds: [], payoutReference: 'PAY-X' }),
    ).rejects.toThrow();
  });

  it('throws VALIDATION when payoutReference is too short', async () => {
    await expect(
      markOrdersPayoutPaid({ orderIds: [ORD_1], payoutReference: 'AB' }),
    ).rejects.toThrow();
  });

  it('throws when fetch query errors', async () => {
    const selectChain = makeChain({
      data: null,
      error: { message: 'fetch boom' },
    });
    mockFrom.mockReturnValueOnce(selectChain);

    await expect(
      markOrdersPayoutPaid({ orderIds: [ORD_1], payoutReference: 'PAY-X' }),
    ).rejects.toThrow('fetch boom');
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });

  it('throws when update query errors', async () => {
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

    await expect(
      markOrdersPayoutPaid({ orderIds: [ORD_1], payoutReference: 'PAY-X' }),
    ).rejects.toThrow('update boom');
    expect(mockRecordAudit).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

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

    expect(result).toEqual({ updated: 1 });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: SOURCER_1 }),
    );
  });
});
