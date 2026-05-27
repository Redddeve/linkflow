import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));

const mockGetClaims = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateEq = vi.fn();
const mockUpdateEq2 = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getClaims: mockGetClaims },
    from: vi.fn(() => ({
      select: mockSelect,
      update: mockUpdate,
    })),
  })),
}));

mockSelect.mockReturnValue({ eq: mockEq });
mockEq.mockReturnValue({ single: mockSingle });
mockUpdate.mockReturnValue({ eq: mockUpdateEq });
mockUpdateEq.mockReturnValue({ eq: mockUpdateEq2 });
mockUpdateEq2.mockResolvedValue({ error: null });

const { requireRole, requireUser, getCurrentUser } = await import('.');

const activeUser = {
  id: 'user-1',
  email: 'a@b.com',
  role: 'Admin' as const,
  status: 'ACTIVE' as const,
  first_name: 'A',
  last_name: 'B',
  manager_id: null,
  created_by_id: null,
  invited_at: null,
  disabled_reason: null,
  avatar: null,
  created_at: new Date().toISOString(),
};

describe('getCurrentUser()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when no claims', async () => {
    mockGetClaims.mockResolvedValue({ data: null });
    expect(await getCurrentUser()).toBeNull();
  });

  it('returns null when user row not found', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });
    expect(await getCurrentUser()).toBeNull();
  });

  it('returns user when found and ACTIVE', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: activeUser, error: null });
    expect(await getCurrentUser()).toEqual(activeUser);
  });
});

describe('requireUser()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects to /login when unauthenticated', async () => {
    mockGetClaims.mockResolvedValue({ data: null });
    mockRedirect.mockImplementation(() => { throw new Error('REDIRECT'); });
    await expect(requireUser()).rejects.toThrow('REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('returns user when authenticated', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: activeUser, error: null });
    expect(await requireUser()).toEqual(activeUser);
  });
});

describe('requireRole()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns user when role matches', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: activeUser, error: null });
    const result = await requireRole(['Admin']);
    expect(result.role).toBe('Admin');
  });

  it('throws FORBIDDEN when role does not match', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: { ...activeUser, role: 'Client' as const }, error: null });
    await expect(requireRole(['Admin'])).rejects.toThrow('FORBIDDEN');
  });

  it('accepts multiple allowed roles', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'user-1' } } });
    mockSingle.mockResolvedValue({ data: { ...activeUser, role: 'Manager' as const }, error: null });
    const result = await requireRole(['Admin', 'Manager']);
    expect(result.role).toBe('Manager');
  });
});
