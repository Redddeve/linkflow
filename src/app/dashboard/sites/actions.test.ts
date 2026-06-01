import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VALID_TRANSITIONS } from '@/lib/schemas/sites';

// ---- mocks ----
vi.mock('@/lib/features/audit', () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/features/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }));

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
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
  update: mockUpdate,
  insert: mockInsert,
  order: vi.fn().mockReturnThis(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: mockFrom, auth: { getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: 'actor-1' } } }) } })),
}));

const { createSite, editSite, setSiteStatus } = await import('./actions');

const adminUser = { id: 'actor-1', role: 'Admin' as const, status: 'ACTIVE' as const, email: 'a@b.com', first_name: 'A', last_name: 'B', manager_id: null, created_by_id: null, invited_at: null, disabled_reason: null, avatar: null };
const sourcerUser = { ...adminUser, id: 'sourcer-1', role: 'Sourcer' as const };
const managerUser = { ...adminUser, id: 'manager-1', role: 'Manager' as const };

const baseSite = {
  id: 'site-1',
  domain: 'example.com',
  status: 'Pending' as const,
  sourcer_id: 'sourcer-1',
  approved_by_id: null,
  approved_at: null,
  needs_changes_by_id: null,
  needs_changes_at: null,
  category_id: null,
  countries: [],
  languages: [],
  link_type: 'dofollow' as const,
  price_cents: 0,
  organic_traffic_count: 0,
  organic_keywords_count: 0,
  sourcer_payout_cents: 0,
  created_at: new Date().toISOString(),
  created_by_id: 'sourcer-1',
};

describe('VALID_TRANSITIONS', () => {
  it('APPROVE only valid from Pending', () => {
    expect(VALID_TRANSITIONS.APPROVE).toContain('Pending');
    expect(VALID_TRANSITIONS.APPROVE).not.toContain('Active');
  });

  it('ARCHIVE only valid from Active', () => {
    expect(VALID_TRANSITIONS.ARCHIVE).toContain('Active');
    expect(VALID_TRANSITIONS.ARCHIVE).not.toContain('Pending');
  });

  it('REACTIVATE only valid from Archived', () => {
    expect(VALID_TRANSITIONS.REACTIVATE).toContain('Archived');
  });
});

describe('createSite()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns CONFLICT when domain already exists', async () => {
    mockRequireRole.mockResolvedValue(sourcerUser);
    mockMaybeSingle.mockResolvedValue({ data: { id: 'existing' }, error: null });

    const result = await createSite({ domain: 'example.com' });
    expect(result).toEqual(
      expect.objectContaining({ success: false, code: 'CONFLICT' }),
    );
  });

  it('creates site and sets sourcer_id for Sourcer actor', async () => {
    mockRequireRole.mockResolvedValue(sourcerUser);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const insertSelectSingle = vi.fn().mockResolvedValue({ data: { id: 'new-site' }, error: null });
    const insertSelect = vi.fn().mockReturnValue({ single: insertSelectSingle });
    mockInsert.mockReturnValue({ select: insertSelect });

    const result = await createSite({ domain: 'new-site.com' });
    expect(result).toEqual({ success: true, data: { siteId: 'new-site' } });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.sourcer_id).toBe('sourcer-1');
    expect(insertCall.status).toBe('Pending');
  });

  it('returns FORBIDDEN when role is not allowed', async () => {
    mockRequireRole.mockRejectedValue(new Error('FORBIDDEN: requires role'));

    const result = await createSite({ domain: 'x.com' });
    expect(result).toEqual(
      expect.objectContaining({ success: false, code: 'FORBIDDEN' }),
    );
  });
});

describe('editSite()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns FORBIDDEN when sourcer tries to edit another sourcer site', async () => {
    mockRequireRole.mockResolvedValue({ ...sourcerUser, id: 'other-sourcer' });
    mockSingle.mockResolvedValue({ data: { ...baseSite, sourcer_id: 'sourcer-1' }, error: null });

    const result = await editSite('site-1', { description: 'test' });
    expect(result).toEqual(
      expect.objectContaining({ success: false, code: 'FORBIDDEN' }),
    );
  });

  it('resets status to Pending when owner (Sourcer) edits', async () => {
    mockRequireRole.mockResolvedValue(sourcerUser);
    mockSingle.mockResolvedValue({ data: { ...baseSite, status: 'Needs changes' as const }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: updateEq });

    const result = await editSite('site-1', { description: 'updated' });
    expect(result).toEqual({ success: true });

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.status).toBe('Pending');
  });

  it('does not reset status when Manager edits', async () => {
    mockRequireRole.mockResolvedValue(managerUser);
    mockSingle.mockResolvedValue({ data: { ...baseSite, status: 'Active' as const }, error: null });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: updateEq });

    const result = await editSite('site-1', { description: 'updated by manager' });
    expect(result).toEqual({ success: true });

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.status).toBeUndefined();
  });
});

describe('setSiteStatus()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns FORBIDDEN for non-Admin', async () => {
    mockRequireRole.mockRejectedValue(new Error('FORBIDDEN: requires role'));

    const result = await setSiteStatus('site-1', 'APPROVE');
    expect(result).toEqual(
      expect.objectContaining({ success: false, code: 'FORBIDDEN' }),
    );
  });

  it('returns CONFLICT when transition is invalid', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockSingle.mockResolvedValue({ data: { ...baseSite, status: 'Active' as const }, error: null });

    const result = await setSiteStatus('site-1', 'APPROVE');
    expect(result).toEqual(
      expect.objectContaining({ success: false, code: 'CONFLICT' }),
    );
  });

  it('approves a Pending site', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockSingle.mockResolvedValue({ data: baseSite, error: null });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: updateEq });

    const result = await setSiteStatus('site-1', 'APPROVE');
    expect(result).toEqual({ success: true });

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.status).toBe('Active');
    expect(updatePayload.approved_by_id).toBe('actor-1');
  });

  it('archives an Active site', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockSingle.mockResolvedValue({ data: { ...baseSite, status: 'Active' as const }, error: null });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: updateEq });

    const result = await setSiteStatus('site-1', 'ARCHIVE');
    expect(result).toEqual({ success: true });

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.status).toBe('Archived');
  });

  it('reactivates an Archived site', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockSingle.mockResolvedValue({ data: { ...baseSite, status: 'Archived' as const }, error: null });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: updateEq });

    const result = await setSiteStatus('site-1', 'REACTIVATE');
    expect(result).toEqual({ success: true });

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.status).toBe('Active');
  });
});
