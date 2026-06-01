import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserRow } from '@/lib/features/auth';

const mockFrom = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockUpdateUser = vi.fn();
const mockResetPasswordForEmail = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: {
      signInWithPassword: mockSignInWithPassword,
      updateUser: mockUpdateUser,
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  })),
}));

const mockRecordAudit = vi.fn();
vi.mock('@/lib/features/audit', () => ({ recordAudit: mockRecordAudit }));

const makeUser = (overrides: Partial<UserRow> = {}): UserRow => ({
  id: 'user-1',
  email: 'user@test.com',
  role: 'Client',
  status: 'ACTIVE',
  first_name: 'Old',
  last_name: 'Name',
  manager_id: null,
  created_by_id: null,
  invited_at: null,
  disabled_reason: null,
  avatar: null,
  ...overrides,
});

const mockRequireUser = vi.fn(async () => makeUser());

vi.mock('@/lib/features/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/features/auth')>();
  return { ...actual, requireUser: mockRequireUser };
});

const { updateProfile, updateOwnPassword, sendOwnPasswordReset } =
  await import('./actions');

function makeUpdateChain(result: { error: unknown }) {
  const chain: Record<string, unknown> = {};
  ['update', 'eq'].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  (chain['eq'] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  return chain;
}

describe('updateProfile()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates the row, records audit with before/after, and uses actor id', async () => {
    const actor = makeUser({
      id: 'user-1',
      first_name: 'Old',
      last_name: 'Name',
      avatar: null,
    });
    mockRequireUser.mockResolvedValueOnce(actor);
    const chain = makeUpdateChain({ error: null });
    mockFrom.mockReturnValue(chain);

    const result = await updateProfile({
      first_name: 'New',
      last_name: 'Name',
      avatar: 'avatar.png',
    });

    expect(result).toEqual({ success: true });
    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(chain.update).toHaveBeenCalledWith({
      first_name: 'New',
      last_name: 'Name',
      avatar: 'avatar.png',
    });
    expect(chain.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'user',
        entityId: 'user-1',
        action: 'user.profile_update',
        before: { first_name: 'Old', last_name: 'Name', avatar: null },
        after: { first_name: 'New', last_name: 'Name', avatar: 'avatar.png' },
      }),
    );
  });

  it('returns VALIDATION when first_name is empty', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser());
    const result = await updateProfile({ first_name: '', last_name: 'Name' });
    expect(result).toEqual({
      success: false,
      code: 'VALIDATION',
      message: 'First name is required',
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns UNKNOWN when the database update fails', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser());
    const chain = makeUpdateChain({ error: { message: 'db boom' } });
    mockFrom.mockReturnValue(chain);

    const result = await updateProfile({ first_name: 'A', last_name: 'B' });
    expect(result).toEqual({
      success: false,
      code: 'UNKNOWN',
      message: 'db boom',
    });
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });
});

describe('updateOwnPassword()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('verifies current password, updates, and records audit', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser({ email: 'user@test.com' }));
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    mockUpdateUser.mockResolvedValueOnce({ error: null });

    const result = await updateOwnPassword('current-pw', 'newpassword123');

    expect(result).toEqual({ success: true });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'current-pw',
    });
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword123' });
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user.password_update',
        entityId: 'user-1',
      }),
    );
  });

  it('returns VALIDATION when current password is missing', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser());
    const result = await updateOwnPassword('', 'newpassword123');
    expect(result).toEqual({
      success: false,
      code: 'VALIDATION',
      message: 'Current password is required',
    });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('returns VALIDATION when new password is under 8 chars', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser());
    const result = await updateOwnPassword('current-pw', 'short');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('VALIDATION');
      expect(result.message).toMatch(/at least 8 characters/);
    }
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('returns VALIDATION when current password is incorrect', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser());
    mockSignInWithPassword.mockResolvedValueOnce({
      error: { message: 'bad creds' },
    });

    const result = await updateOwnPassword('wrong-pw', 'newpassword123');
    expect(result).toEqual({
      success: false,
      code: 'VALIDATION',
      message: 'Current password is incorrect',
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });

  it('returns UNKNOWN when supabase updateUser fails', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser());
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    mockUpdateUser.mockResolvedValueOnce({ error: { message: 'update boom' } });

    const result = await updateOwnPassword('current-pw', 'newpassword123');
    expect(result).toEqual({
      success: false,
      code: 'UNKNOWN',
      message: 'update boom',
    });
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });
});

describe('sendOwnPasswordReset()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends reset email to actor and records audit', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: 'user-1', email: 'user@test.com' }),
    );
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });

    const result = await sendOwnPasswordReset();

    expect(result).toEqual({ success: true });
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'user@test.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/auth/update-password'),
      }),
    );
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user.password_reset_requested',
        entityId: 'user-1',
      }),
    );
  });

  it('returns UNKNOWN when supabase returns an error', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser());
    mockResetPasswordForEmail.mockResolvedValueOnce({
      error: { message: 'reset boom' },
    });

    const result = await sendOwnPasswordReset();
    expect(result).toEqual({
      success: false,
      code: 'UNKNOWN',
      message: 'reset boom',
    });
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });
});
