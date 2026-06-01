import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/features/audit', () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));

const mockRequireRole = vi.fn();
vi.mock('@/lib/features/auth', () => ({ requireRole: mockRequireRole }));

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();

const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
  update: mockUpdate,
  insert: mockInsert,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: { getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: 'actor-1' } } }) },
  })),
}));

const adminUser = { id: 'actor-1', role: 'Admin' as const, status: 'ACTIVE' as const, email: 'a@b.com', first_name: 'A', last_name: 'B', manager_id: null, created_by_id: null, invited_at: null, disabled_reason: null, avatar: null };

const { createCategory, editCategory } = await import('./actions');

describe('createCategory()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns FORBIDDEN for non-Admin', async () => {
    mockRequireRole.mockRejectedValue(new Error('FORBIDDEN: requires role'));
    const result = await createCategory({ name: 'Tech' });
    expect(result).toEqual(
      expect.objectContaining({ success: false, code: 'FORBIDDEN' }),
    );
  });

  it('returns CONFLICT on duplicate name', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockMaybeSingle.mockResolvedValue({ data: { id: 'existing-cat' }, error: null });

    const result = await createCategory({ name: 'Tech' });
    expect(result).toEqual(
      expect.objectContaining({ success: false, code: 'CONFLICT' }),
    );
  });

  it('creates category when name is unique', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const insertSelectSingle = vi.fn().mockResolvedValue({ data: { id: 'new-cat' }, error: null });
    const insertSelect = vi.fn().mockReturnValue({ single: insertSelectSingle });
    mockInsert.mockReturnValue({ select: insertSelect });

    const result = await createCategory({ name: 'Technology' });
    expect(result).toEqual({ success: true, data: { categoryId: 'new-cat' } });
  });
});

describe('editCategory()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns FORBIDDEN for non-Admin', async () => {
    mockRequireRole.mockRejectedValue(new Error('FORBIDDEN: requires role'));
    const result = await editCategory('cat-1', { name: 'New Name' });
    expect(result).toEqual(
      expect.objectContaining({ success: false, code: 'FORBIDDEN' }),
    );
  });

  it('returns NOT_FOUND for unknown category', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const result = await editCategory('cat-1', { name: 'New Name' });
    expect(result).toEqual(
      expect.objectContaining({ success: false, code: 'NOT_FOUND' }),
    );
  });

  it('returns CONFLICT when new name already taken', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockSingle.mockResolvedValue({ data: { id: 'cat-1', name: 'Old Name' }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: { id: 'other-cat' }, error: null });

    const result = await editCategory('cat-1', { name: 'Tech' });
    expect(result).toEqual(
      expect.objectContaining({ success: false, code: 'CONFLICT' }),
    );
  });

  it('updates category when name is available', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockSingle.mockResolvedValue({ data: { id: 'cat-1', name: 'Old Name' }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: updateEq });

    const result = await editCategory('cat-1', { name: 'New Name' });
    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledWith({ name: 'New Name' });
  });
});
