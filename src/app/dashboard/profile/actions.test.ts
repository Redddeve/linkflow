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

    await updateProfile({
      first_name: 'New',
      last_name: 'Name',
      avatar: 'avatar.png',
    });

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

  it('throws VALIDATION when first_name is empty', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser());
    await expect(
      updateProfile({ first_name: '', last_name: 'Name' }),
    ).rejects.toThrow('First name is required');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('throws when the database update fails', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser());
    const chain = makeUpdateChain({ error: { message: 'db boom' } });
    mockFrom.mockReturnValue(chain);

    await expect(
      updateProfile({ first_name: 'A', last_name: 'B' }),
    ).rejects.toThrow('db boom');
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });
});

describe('updateOwnPassword()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('verifies current password, updates, and records audit', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser({ email: 'user@test.com' }));
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    mockUpdateUser.mockResolvedValueOnce({ error: null });

    await updateOwnPassword('current-pw', 'newpassword123');

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

  it('throws VALIDATION when current password is missing', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser());
    await expect(updateOwnPassword('', 'newpassword123')).rejects.toThrow(
      'Current password is required',
    );
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('throws VALIDATION when new password is under 8 chars', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser());
    await expect(updateOwnPassword('current-pw', 'short')).rejects.toThrow(
      'at least 8 characters',
    );
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('throws VALIDATION when current password is incorrect', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser());
    mockSignInWithPassword.mockResolvedValueOnce({
      error: { message: 'bad creds' },
    });

    await expect(
      updateOwnPassword('wrong-pw', 'newpassword123'),
    ).rejects.toThrow('Current password is incorrect');
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });

  it('throws when supabase updateUser fails', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser());
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    mockUpdateUser.mockResolvedValueOnce({ error: { message: 'update boom' } });

    await expect(
      updateOwnPassword('current-pw', 'newpassword123'),
    ).rejects.toThrow('update boom');
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

    await sendOwnPasswordReset();

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

  it('throws when supabase returns an error', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser());
    mockResetPasswordForEmail.mockResolvedValueOnce({
      error: { message: 'reset boom' },
    });

    await expect(sendOwnPasswordReset()).rejects.toThrow('reset boom');
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });
});
