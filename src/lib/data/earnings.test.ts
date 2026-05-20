import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEqMonth = vi.fn();
const mockNotNull = vi.fn();
const mockEqSourcer = vi.fn();
const mockSelect = vi.fn();

function buildChain(result: { data: unknown; error: unknown } = { data: [], error: null }) {
  const chain: Record<string, unknown> = {};
  chain.eq = vi.fn((col: string, val: unknown) => {
    if (col === 'billing_month') mockEqMonth(col, val);
    if (col === 'sites.sourcer_id') mockEqSourcer(col, val);
    return chain;
  });
  chain.not = vi.fn((col: string, op: string, val: unknown) => {
    mockNotNull(col, op, val);
    return chain;
  });
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
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

  it('filters by billing_month, published_at not null, and inner-joins sites', async () => {
    await fetchEarningsTotals({ month: '2026-04-01' });

    expect(mockFrom).toHaveBeenCalledWith('orders');
    const selectArg = String((mockSelect.mock.calls[0] as unknown[])[0]);
    expect(selectArg).toContain('price_cents');
    expect(selectArg).toContain('sites!inner');
    expect(mockEqMonth).toHaveBeenCalledWith('billing_month', '2026-04-01');
    expect(mockNotNull).toHaveBeenCalledWith('published_at', 'is', null);
  });

  it('filters by sites.sourcer_id when sourcerId is provided', async () => {
    await fetchEarningsTotals({ month: '2026-04-01', sourcerId: 'user-7' });
    expect(mockEqSourcer).toHaveBeenCalledWith('sites.sourcer_id', 'user-7');
  });

  it('does not filter by sourcer when sourcerId is omitted', async () => {
    await fetchEarningsTotals({ month: '2026-04-01' });
    expect(mockEqSourcer).not.toHaveBeenCalled();
  });

  it('sums price_cents and counts rows', async () => {
    currentChain = buildChain({
      data: [{ price_cents: 1500 }, { price_cents: 2500 }, { price_cents: 1000 }],
      error: null,
    });

    const totals = await fetchEarningsTotals({ month: '2026-04-01' });
    expect(totals.earningsCents).toBe(5000);
    expect(totals.ordersCount).toBe(3);
  });

  it('returns zeros when there are no rows', async () => {
    currentChain = buildChain({ data: [], error: null });
    const totals = await fetchEarningsTotals({ month: '2026-04-01' });
    expect(totals).toEqual({ earningsCents: 0, ordersCount: 0 });
  });
});
