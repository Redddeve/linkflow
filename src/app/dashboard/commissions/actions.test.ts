import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserRow } from '@/lib/auth';

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: mockFrom, rpc: mockRpc })),
}));

const mockRecordAudit = vi.fn();
const mockNotify = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('@/lib/audit', () => ({ recordAudit: mockRecordAudit }));
vi.mock('@/lib/notify', () => ({ notify: mockNotify }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

const { verifyLinkMock } = vi.hoisted(() => ({ verifyLinkMock: vi.fn() }));
vi.mock('@/lib/verify-link', () => ({ verifyLink: verifyLinkMock }));

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
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return { ...actual, requireRole: mockRequireRole };
});

const { markCommissionsPaid, promoteCommissions } = await import('./actions');

type ChainResult = { data: unknown; error: unknown };

function makeChain(result: ChainResult) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'neq', 'maybeSingle', 'single', 'order', 'limit'];
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  (chain['single'] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  (chain['maybeSingle'] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  // Terminal awaitable for `.in()`, `.update().eq()`, etc.
  for (const m of methods) {
    const fn = chain[m] as ReturnType<typeof vi.fn>;
    fn.mockImplementation(() => {
      const next = { ...chain, then: undefined };
      // Make it thenable for awaited calls
      (next as { then?: unknown }).then = (resolve: (r: ChainResult) => unknown) => resolve(result);
      return next;
    });
  }
  return chain;
}

const C1 = 'a0000001-0000-4000-8000-000000000001';
const C2 = 'a0000002-0000-4000-8000-000000000002';
const SOURCER_1 = 'b0000001-0000-4000-8000-000000000001';
const SOURCER_2 = 'b0000002-0000-4000-8000-000000000002';
const ADMIN_1 = 'c0000001-0000-4000-8000-000000000001';

describe('markCommissionsPaid()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue(makeUser({ id: ADMIN_1, role: 'Admin' }));
  });

  it('throws FORBIDDEN when caller is not Admin', async () => {
    mockRequireRole.mockRejectedValueOnce(new Error('FORBIDDEN: requires role Admin'));
    await expect(
      markCommissionsPaid({ commissionIds: [C1], payoutReference: 'PAYOUT-001' }),
    ).rejects.toThrow('permission');
  });

  it('throws VALIDATION when commissionIds is empty', async () => {
    await expect(
      markCommissionsPaid({ commissionIds: [], payoutReference: 'PAYOUT-001' }),
    ).rejects.toThrow();
  });

  it('throws VALIDATION when payoutReference is too short', async () => {
    await expect(
      markCommissionsPaid({ commissionIds: [C1], payoutReference: 'X' }),
    ).rejects.toThrow();
  });

  it('updates payable commissions to PAID, audits and notifies each sourcer', async () => {
    // Step 1: update returns rows
    const updateResult = {
      data: [
        { id: C1, sourcer_id: SOURCER_1, amount_cents: 5000, order_id: 'o1' },
        { id: C2, sourcer_id: SOURCER_2, amount_cents: 7500, order_id: 'o2' },
      ],
      error: null,
    };
    mockFrom.mockReturnValue(makeChain(updateResult));

    await markCommissionsPaid({
      commissionIds: [C1, C2],
      payoutReference: 'PAYOUT-001',
    });

    expect(mockRecordAudit).toHaveBeenCalledTimes(2);
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'commission', action: 'commission.paid', entityId: C1 }),
    );
    expect(mockNotify).toHaveBeenCalledTimes(2);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: SOURCER_1, type: 'commission.paid' }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: SOURCER_2, type: 'commission.paid' }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/commissions');
  });

  it('does nothing when no rows matched the PAYABLE guard', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    await markCommissionsPaid({ commissionIds: [C1], payoutReference: 'PAYOUT-001' });
    expect(mockRecordAudit).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });
});

describe('promoteCommissions()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue(makeUser({ id: ADMIN_1, role: 'Admin' }));
    verifyLinkMock.mockReset();
  });

  it('throws FORBIDDEN when caller is not Admin', async () => {
    mockRequireRole.mockRejectedValueOnce(new Error('FORBIDDEN'));
    await expect(promoteCommissions()).rejects.toThrow('permission');
  });

  it('promotes when verifier returns ok', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          commission_id: C1,
          order_id: 'o1',
          sourcer_id: SOURCER_1,
          published_url: 'https://example.com/post',
          site_domain: 'example.com',
          retry_count: 0,
        },
      ],
      error: null,
    });
    verifyLinkMock.mockResolvedValueOnce({ ok: true });
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));

    const result = await promoteCommissions();

    expect(result.promoted).toBe(1);
    expect(result.retried).toBe(0);
    expect(result.reversed).toBe(0);
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'commission.promoted', entityId: C1 }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: SOURCER_1, type: 'commission.payable' }),
    );
  });

  it('increments retry_count when verifier fails and retry_count < 3', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          commission_id: C1,
          order_id: 'o1',
          sourcer_id: SOURCER_1,
          published_url: 'https://example.com/post',
          site_domain: 'example.com',
          retry_count: 1,
        },
      ],
      error: null,
    });
    verifyLinkMock.mockResolvedValueOnce({ ok: false, reason: 'http_status' });
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));

    const result = await promoteCommissions();

    expect(result.promoted).toBe(0);
    expect(result.retried).toBe(1);
    expect(result.reversed).toBe(0);
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'commission.promotion_retry', entityId: C1 }),
    );
  });

  it('reverses commission when retry_count >= 3 and verifier fails', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          commission_id: C1,
          order_id: 'o1',
          sourcer_id: SOURCER_1,
          published_url: 'https://example.com/post',
          site_domain: 'example.com',
          retry_count: 3,
        },
      ],
      error: null,
    });
    verifyLinkMock.mockResolvedValueOnce({ ok: false, reason: 'http_status' });

    // For reversal we need: update commission, select admins, notify
    const adminListResult = {
      data: [{ id: ADMIN_1 }],
      error: null,
    };
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: null, error: null }); // update commission
      return makeChain(adminListResult); // admin lookup
    });

    const result = await promoteCommissions();

    expect(result.reversed).toBe(1);
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'commission.reversed', entityId: C1 }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: SOURCER_1, type: 'commission.reversed' }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: ADMIN_1, type: 'commission.reversed.escalation' }),
    );
  });

  it('handles a mixed batch correctly', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        { commission_id: C1, order_id: 'o1', sourcer_id: SOURCER_1, published_url: 'https://a.com/x', site_domain: 'a.com', retry_count: 0 },
        { commission_id: C2, order_id: 'o2', sourcer_id: SOURCER_2, published_url: 'https://b.com/x', site_domain: 'b.com', retry_count: 0 },
      ],
      error: null,
    });
    verifyLinkMock
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, reason: 'http_status' });
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));

    const result = await promoteCommissions();

    expect(result.promoted).toBe(1);
    expect(result.retried).toBe(1);
    expect(result.reversed).toBe(0);
  });

  it('returns zeros when no candidates', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    const result = await promoteCommissions();
    expect(result).toEqual({ promoted: 0, retried: 0, reversed: 0, errored: 0 });
    expect(verifyLinkMock).not.toHaveBeenCalled();
  });

  it('counts errored when DB update fails', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        { commission_id: C1, order_id: 'o1', sourcer_id: SOURCER_1, published_url: 'https://a.com/x', site_domain: 'a.com', retry_count: 0 },
      ],
      error: null,
    });
    verifyLinkMock.mockResolvedValueOnce({ ok: true });
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'db boom' } }));

    const result = await promoteCommissions();
    expect(result.errored).toBe(1);
    expect(result.promoted).toBe(0);
  });
});
