import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEqMonth = vi.fn();
const mockNotCalls = vi.fn();
const mockEqSourcer = vi.fn();
const mockSelect = vi.fn();
const mockOrder = vi.fn();

function buildChain(result: { data: unknown; error: unknown } = { data: [], error: null }) {
  const chain: Record<string, unknown> = {};
  chain.eq = vi.fn((col: string, val: unknown) => {
    if (col === 'billing_month') mockEqMonth(col, val);
    if (col === 'sites.sourcer_id') mockEqSourcer(col, val);
    return chain;
  });
  chain.not = vi.fn((col: string, op: string, val: unknown) => {
    mockNotCalls(col, op, val);
    return chain;
  });
  chain.order = vi.fn((...args: unknown[]) => {
    mockOrder(...args);
    return Promise.resolve(result);
  });
  return chain;
}

let currentChain = buildChain();
const mockFrom = vi.fn(() => ({
  select: (...args: unknown[]) => {
    mockSelect(...args);
    return currentChain;
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

const { fetchEarningsTotals } = await import('./earnings');

describe('fetchEarningsTotals()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentChain = buildChain({ data: [], error: null });
  });

  it('selects sourcer_payout_cents and inner-joins sites', async () => {
    await fetchEarningsTotals({ month: '2026-04-01' });

    expect(mockFrom).toHaveBeenCalledWith('orders');
    const selectArg = String((mockSelect.mock.calls[0] as unknown[])[0]);
    expect(selectArg).toContain('sourcer_payout_cents');
    expect(selectArg).toContain('sites!inner');
    expect(mockEqMonth).toHaveBeenCalledWith('billing_month', '2026-04-01');
    expect(mockNotCalls).toHaveBeenCalledWith('published_at', 'is', null);
    expect(mockNotCalls).toHaveBeenCalledWith('sourcer_payout_cents', 'is', null);
  });

  it('filters by sites.sourcer_id when sourcerId is provided', async () => {
    await fetchEarningsTotals({ month: '2026-04-01', sourcerId: 'user-7' });
    expect(mockEqSourcer).toHaveBeenCalledWith('sites.sourcer_id', 'user-7');
  });

  it('requires non-null sourcer when sourcerId is omitted', async () => {
    await fetchEarningsTotals({ month: '2026-04-01' });
    expect(mockEqSourcer).not.toHaveBeenCalled();
    expect(mockNotCalls).toHaveBeenCalledWith('sites.sourcer_id', 'is', null);
  });

  it('splits totals into paid vs unpaid', async () => {
    currentChain = buildChain({
      data: [
        {
          id: 'o1',
          site_domain: 'a.com',
          published_at: '2026-04-10T00:00:00Z',
          publish_date: '2026-04-10',
          sourcer_payout_cents: 1500,
          sourcer_paid_at: null,
          sourcer_payout_reference: null,
          sites: { sourcer_id: 's1' },
        },
        {
          id: 'o2',
          site_domain: 'b.com',
          published_at: '2026-04-12T00:00:00Z',
          publish_date: '2026-04-12',
          sourcer_payout_cents: 2500,
          sourcer_paid_at: '2026-04-20T00:00:00Z',
          sourcer_payout_reference: 'PAY-1',
          sites: { sourcer_id: 's1' },
        },
      ],
      error: null,
    });

    const totals = await fetchEarningsTotals({ month: '2026-04-01' });
    expect(totals.earningsCents).toBe(4000);
    expect(totals.paidCents).toBe(2500);
    expect(totals.unpaidCents).toBe(1500);
    expect(totals.ordersCount).toBe(2);
  });

  it('returns zeros when there are no rows', async () => {
    currentChain = buildChain({ data: [], error: null });
    const totals = await fetchEarningsTotals({ month: '2026-04-01' });
    expect(totals).toEqual({
      earningsCents: 0,
      paidCents: 0,
      unpaidCents: 0,
      ordersCount: 0,
    });
  });
});
