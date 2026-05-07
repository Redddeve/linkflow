import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@/lib/errors';

// ---- mocks ----
vi.mock('@/lib/audit', () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }));

const mockRequireRole = vi.fn();
vi.mock('@/lib/auth', () => ({ requireRole: mockRequireRole }));

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

const { createSite, editSite, setSiteStatus, VALID_TRANSITIONS } = await import('./actions');

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

  it('throws CONFLICT when domain already exists', async () => {
    mockRequireRole.mockResolvedValue(sourcerUser);
    mockMaybeSingle.mockResolvedValue({ data: { id: 'existing' }, error: null });

    await expect(createSite({ domain: 'example.com' })).rejects.toThrow(
      expect.objectContaining({ code: 'CONFLICT' }),
    );
  });

  it('creates site and sets sourcer_id for Sourcer actor', async () => {
    mockRequireRole.mockResolvedValue(sourcerUser);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const insertSelectSingle = vi.fn().mockResolvedValue({ data: { id: 'new-site' }, error: null });
    const insertSelect = vi.fn().mockReturnValue({ single: insertSelectSingle });
    mockInsert.mockReturnValue({ select: insertSelect });

    const result = await createSite({ domain: 'new-site.com' });
    expect(result).toEqual({ siteId: 'new-site' });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.sourcer_id).toBe('sourcer-1');
    expect(insertCall.status).toBe('Pending');
  });

  it('sets sourcer_id to null for Manager actor', async () => {
    mockRequireRole.mockResolvedValue(managerUser);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const insertSelectSingle = vi.fn().mockResolvedValue({ data: { id: 'new-site' }, error: null });
    const insertSelect = vi.fn().mockReturnValue({ single: insertSelectSingle });
    mockInsert.mockReturnValue({ select: insertSelect });

    await createSite({ domain: 'manager-site.com' });
    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.sourcer_id).toBeNull();
  });

  it('throws FORBIDDEN when role is not allowed', async () => {
    mockRequireRole.mockRejectedValue(new Error('FORBIDDEN: requires role'));

    await expect(createSite({ domain: 'x.com' })).rejects.toThrow(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    );
  });
});

describe('editSite()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws FORBIDDEN when sourcer tries to edit another sourcer site', async () => {
    mockRequireRole.mockResolvedValue({ ...sourcerUser, id: 'other-sourcer' });
    mockSingle.mockResolvedValue({ data: { ...baseSite, sourcer_id: 'sourcer-1' }, error: null });

    await expect(editSite('site-1', { description: 'test' })).rejects.toThrow(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    );
  });

  it('resets status to Pending when owner (Sourcer) edits', async () => {
    mockRequireRole.mockResolvedValue(sourcerUser);
    mockSingle.mockResolvedValue({ data: { ...baseSite, status: 'Needs changes' as const }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: updateEq });

    await editSite('site-1', { description: 'updated' });

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.status).toBe('Pending');
  });

  it('does not reset status when Manager edits', async () => {
    mockRequireRole.mockResolvedValue(managerUser);
    mockSingle.mockResolvedValue({ data: { ...baseSite, status: 'Active' as const }, error: null });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: updateEq });

    await editSite('site-1', { description: 'updated by manager' });

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.status).toBeUndefined();
  });
});

describe('setSiteStatus()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws FORBIDDEN for non-Admin', async () => {
    mockRequireRole.mockRejectedValue(new Error('FORBIDDEN: requires role'));

    await expect(setSiteStatus('site-1', 'APPROVE')).rejects.toThrow(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    );
  });

  it('throws CONFLICT when transition is invalid', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockSingle.mockResolvedValue({ data: { ...baseSite, status: 'Active' as const }, error: null });

    await expect(setSiteStatus('site-1', 'APPROVE')).rejects.toThrow(
      expect.objectContaining({ code: 'CONFLICT' }),
    );
  });

  it('approves a Pending site', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockSingle.mockResolvedValue({ data: baseSite, error: null });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: updateEq });

    await setSiteStatus('site-1', 'APPROVE');

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.status).toBe('Active');
    expect(updatePayload.approved_by_id).toBe('actor-1');
  });

  it('blocks NEEDS_CHANGES with short change_note', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockSingle.mockResolvedValue({ data: baseSite, error: null });

    await expect(setSiteStatus('site-1', 'NEEDS_CHANGES', 'short')).rejects.toThrow(AppError);
  });

  it('sets NEEDS_CHANGES with valid note', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockSingle.mockResolvedValue({ data: baseSite, error: null });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: updateEq });

    await setSiteStatus('site-1', 'NEEDS_CHANGES', 'Please fix the description and add metrics');

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.status).toBe('Needs changes');
    expect(updatePayload.needs_changes_by_id).toBe('actor-1');
  });

  it('archives an Active site', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockSingle.mockResolvedValue({ data: { ...baseSite, status: 'Active' as const }, error: null });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: updateEq });

    await setSiteStatus('site-1', 'ARCHIVE');

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.status).toBe('Archived');
  });

  it('reactivates an Archived site', async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockSingle.mockResolvedValue({ data: { ...baseSite, status: 'Archived' as const }, error: null });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: updateEq });

    await setSiteStatus('site-1', 'REACTIVATE');

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.status).toBe('Active');
  });
});
