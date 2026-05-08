import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRange = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
const mockOrder = vi.fn(() => ({ range: mockRange }));
const mockIlike = vi.fn(() => ({ order: mockOrder }));
const mockEq = vi.fn(() => ({ ilike: mockIlike, order: mockOrder, range: mockRange }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockSelectCartItems = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }));

const mockFrom = vi.fn((table: string) => {
  if (table === 'cart_items') return { select: mockSelectCartItems };
  return { select: mockSelect };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

const { fetchActiveCatalog } = await import('./catalog');

// Expected client-visible columns (must NOT include sourcer_notes, contact_info, requirements, sourcer_id, sourcer_payout_cents)
const EXPECTED_SELECT =
  'id, domain, category_id, link_type, dr, organic_traffic_count, organic_keywords_count, countries, languages, description, keywords_relevance, top_countries, price_cents, status, categories(name)';

describe('fetchActiveCatalog()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('selects only client-visible columns', async () => {
    await fetchActiveCatalog({}, 'user-1');

    expect(mockSelect).toHaveBeenCalledWith(EXPECTED_SELECT, { count: 'exact' });
  });

  it('does not expose sourcer_notes in select', async () => {
    await fetchActiveCatalog({}, 'user-1');

    const selectCall = String((mockSelect.mock.calls as unknown[][])[0]?.[0] ?? '');
    expect(selectCall).not.toContain('sourcer_notes');
    expect(selectCall).not.toContain('sourcer_payout_cents');
    expect(selectCall).not.toContain('sourcer_id');
  });

  it('always filters by status = Active', async () => {
    await fetchActiveCatalog({}, 'user-1');
    expect(mockEq).toHaveBeenCalledWith('status', 'Active');
  });

  it('returns sites with inMyCart flag', async () => {
    mockRange.mockResolvedValueOnce({
      data: [{ id: 'site-1', domain: 'a.com', categories: null }],
      count: 1,
      error: null,
    });
    mockSelectCartItems.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValue({ data: [{ site_id: 'site-1' }], error: null }),
    });

    const { sites, total } = await fetchActiveCatalog({}, 'user-1');

    expect(total).toBe(1);
    expect(sites[0].inMyCart).toBe(true);
  });

  it('marks inMyCart false for sites not in cart', async () => {
    mockRange.mockResolvedValueOnce({
      data: [{ id: 'site-2', domain: 'b.com', categories: null }],
      count: 1,
      error: null,
    });
    mockSelectCartItems.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { sites } = await fetchActiveCatalog({}, 'user-1');
    expect(sites[0].inMyCart).toBe(false);
  });
});
