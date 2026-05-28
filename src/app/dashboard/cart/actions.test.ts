import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- mocks ----
vi.mock('@/lib/features/audit', () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/features/notify', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const mockRequireRole = vi.fn();
vi.mock('@/lib/features/auth', () => ({ requireRole: mockRequireRole }));

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockDeleteEq = vi.fn();
const mockUpdateEq = vi.fn();
const mockInsertSelectSingle = vi.fn();
const mockOrdersLimit = vi.fn().mockResolvedValue({ data: [], error: null });

function makeStandardChain() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
    delete: vi.fn(() => ({ eq: mockDeleteEq })),
    update: vi.fn(() => ({ eq: mockUpdateEq })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({ single: mockInsertSelectSingle })),
    })),
  };
}

// orders chain: .from('orders').select('id').eq().eq().not('status', 'in', ...).limit(1)
function makeOrdersChain() {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          not: vi.fn(() => ({ limit: mockOrdersLimit })),
        })),
      })),
    })),
  };
}

const mockFrom = vi.fn((table?: string) => {
  if (table === 'orders') return makeOrdersChain();
  return makeStandardChain();
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

const { addToCart, removeFromCart, updateCartItem } = await import('./actions');

const clientUser = {
  id: 'client-1',
  role: 'Client' as const,
  status: 'ACTIVE' as const,
  email: 'c@b.com',
  first_name: 'C',
  last_name: 'L',
  manager_id: null,
  created_by_id: null,
  invited_at: null,
  disabled_reason: null,
  avatar: null,
};

describe('addToCart()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws FORBIDDEN for non-Client roles', async () => {
    mockRequireRole.mockRejectedValue(
      new Error('FORBIDDEN: requires role Client'),
    );

    await expect(addToCart({ siteId: 'site-1' })).rejects.toThrow(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    );
  });

  it('throws VALIDATION for invalid uuid', async () => {
    mockRequireRole.mockResolvedValue(clientUser);

    await expect(addToCart({ siteId: 'not-a-uuid' })).rejects.toThrow(
      expect.objectContaining({ code: 'VALIDATION' }),
    );
  });

  it('throws NOT_FOUND when site does not exist', async () => {
    mockRequireRole.mockResolvedValue(clientUser);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      addToCart({ siteId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890' }),
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' }));
  });

  it('throws VALIDATION when site is not Active', async () => {
    mockRequireRole.mockResolvedValue(clientUser);
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'site-1', status: 'Archived' },
      error: null,
    });

    await expect(
      addToCart({ siteId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890' }),
    ).rejects.toThrow(expect.objectContaining({ code: 'VALIDATION' }));
  });

  it('throws CONFLICT when site already in cart (23505)', async () => {
    mockRequireRole.mockResolvedValue(clientUser);
    // site = Active
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'site-1', status: 'Active' },
      error: null,
    });
    // no active order
    mockOrdersLimit.mockResolvedValueOnce({ data: [], error: null });
    // cart = existing
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'cart-1' },
      error: null,
    });
    // insert в†’ unique violation
    mockInsertSelectSingle.mockResolvedValueOnce({
      data: null,
      error: { code: '23505', message: 'unique' },
    });

    await expect(
      addToCart({ siteId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890' }),
    ).rejects.toThrow(expect.objectContaining({ code: 'CONFLICT' }));
  });
});

describe('removeFromCart()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws FORBIDDEN for non-Client roles', async () => {
    mockRequireRole.mockRejectedValue(
      new Error('FORBIDDEN: requires role Client'),
    );

    await expect(
      removeFromCart({ cartItemId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890' }),
    ).rejects.toThrow(expect.objectContaining({ code: 'FORBIDDEN' }));
  });

  it('throws NOT_FOUND when item does not exist', async () => {
    mockRequireRole.mockResolvedValue(clientUser);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      removeFromCart({ cartItemId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890' }),
    ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' }));
  });

  it('throws FORBIDDEN when item belongs to another client', async () => {
    mockRequireRole.mockResolvedValue(clientUser);
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'item-1',
        site_id: 'site-1',
        cart_id: 'cart-1',
        carts: { created_by_id: 'other-client' },
      },
      error: null,
    });

    await expect(
      removeFromCart({ cartItemId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890' }),
    ).rejects.toThrow(expect.objectContaining({ code: 'FORBIDDEN' }));
  });

  it('successfully removes item from cart', async () => {
    mockRequireRole.mockResolvedValue(clientUser);
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'item-1',
        site_id: 'site-1',
        cart_id: 'cart-1',
        carts: { created_by_id: 'client-1' },
      },
      error: null,
    });
    mockDeleteEq.mockResolvedValue({ error: null });

    await expect(
      removeFromCart({ cartItemId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890' }),
    ).resolves.toBeUndefined();
    expect(mockDeleteEq).toHaveBeenCalled();
  });
});

describe('updateCartItem()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws FORBIDDEN for non-Client roles', async () => {
    mockRequireRole.mockRejectedValue(
      new Error('FORBIDDEN: requires role Client'),
    );

    await expect(
      updateCartItem({
        cartItemId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
        publish_date: '2099-01-01',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'FORBIDDEN' }));
  });

  it('throws VALIDATION for past publish_date', async () => {
    mockRequireRole.mockResolvedValue(clientUser);

    await expect(
      updateCartItem({
        cartItemId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
        publish_date: '2020-01-01',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'VALIDATION' }));
  });

  it('throws FORBIDDEN when item belongs to another client', async () => {
    mockRequireRole.mockResolvedValue(clientUser);
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'item-1',
        publish_date: null,
        cart_id: 'cart-1',
        carts: { created_by_id: 'other' },
      },
      error: null,
    });

    await expect(
      updateCartItem({
        cartItemId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
        publish_date: '2099-06-01',
      }),
    ).rejects.toThrow(expect.objectContaining({ code: 'FORBIDDEN' }));
  });

  it('updates publish_date for owner', async () => {
    mockRequireRole.mockResolvedValue(clientUser);
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'item-1',
        publish_date: null,
        cart_id: 'cart-1',
        carts: { created_by_id: 'client-1' },
      },
      error: null,
    });
    mockUpdateEq.mockResolvedValue({ error: null });

    await expect(
      updateCartItem({
        cartItemId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
        publish_date: '2099-06-01',
      }),
    ).resolves.toBeUndefined();

    expect(mockUpdateEq).toHaveBeenCalled();
  });
});
