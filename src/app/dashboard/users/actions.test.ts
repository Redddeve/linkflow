import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserRow } from '@/lib/features/auth';

// ── Shared mock state ──────────────────────────────────────────────────────────

const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockAdminInvite = vi.fn();
const mockAdminGenerateLink = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        inviteUserByEmail: mockAdminInvite,
        generateLink: mockAdminGenerateLink,
      },
    },
  })),
}));

const mockRecordAudit = vi.fn();
const mockNotify = vi.fn();
const mockMailerSend = vi.fn();

vi.mock('@/lib/features/audit', () => ({ recordAudit: mockRecordAudit }));
vi.mock('@/lib/features/notify', () => ({ notify: mockNotify }));
vi.mock('@/lib/features/email', () => ({
  getMailer: () => ({ send: mockMailerSend }),
  EMAIL_TEMPLATES: {
    'user.invite_resent': {
      templateId: 2,
      buildParams: (input: {
        first_name?: string | null;
        invite_link: string;
      }) => ({
        first_name: input.first_name ?? '',
        invite_link: input.invite_link,
      }),
    },
  },
}));

// ── Auth mock helpers ──────────────────────────────────────────────────────────

const makeAdminUser = (overrides: Partial<UserRow> = {}): UserRow => ({
  id: 'admin-1',
  email: 'admin@test.com',
  role: 'Admin',
  status: 'ACTIVE',
  first_name: 'Admin',
  last_name: 'User',
  manager_id: null,
  created_by_id: null,
  invited_at: new Date().toISOString(),
  disabled_reason: null,
  avatar: null,
  ...overrides,
});

const makeManagerUser = (overrides: Partial<UserRow> = {}): UserRow =>
  makeAdminUser({
    id: 'mgr-1',
    email: 'mgr@test.com',
    role: 'Manager',
    first_name: 'Mgr',
    last_name: 'User',
    ...overrides,
  });

vi.mock('@/lib/features/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/features/auth')>();
  return {
    ...actual,
    requireRole: vi.fn(async () => makeAdminUser()),
  };
});

// ── Import actions after mocks ─────────────────────────────────────────────────

const { inviteUser, resendInvite, editUser, disableUser, activateUser } =
  await import('./actions');

const { requireRole } = await import('@/lib/features/auth');

// ── Fluent Supabase stub builder ───────────────────────────────────────────────

type ChainResult = { data: unknown; error: unknown; count?: number };

function makeChain(result: ChainResult) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'ilike',
    'in',
    'maybeSingle',
    'single',
    'order',
  ];
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  (chain['single'] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  (chain['maybeSingle'] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  return chain;
}

// ── inviteUser ─────────────────────────────────────────────────────────────────

describe('inviteUser()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws EMAIL_EXISTS when email already used', async () => {
    const chain = makeChain({
      data: { id: 'existing', status: 'ACTIVE' },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(
      inviteUser({
        email: 'dup@test.com',
        first_name: 'A',
        last_name: 'B',
        role: 'Client',
      }),
    ).rejects.toThrow('already exists');
  });

  it('creates invite and records audit on success', async () => {
    // First call: email uniqueness check → not found
    const noUser = makeChain({ data: null, error: null });
    // Second call: update invited_at
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(noUser).mockReturnValue(updateChain);

    mockAdminInvite.mockResolvedValue({
      data: { user: { id: 'new-user-1' } },
      error: null,
    });

    const result = await inviteUser({
      email: 'new@test.com',
      first_name: 'New',
      last_name: 'User',
      role: 'Client',
    });

    expect(result.userId).toBe('new-user-1');
    expect(mockAdminInvite).toHaveBeenCalledWith(
      'new@test.com',
      expect.objectContaining({
        data: expect.objectContaining({ role: 'Client' }),
      }),
    );
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user.invite',
        entityId: 'new-user-1',
      }),
    );
  });

  it('throws FORBIDDEN when caller is not Admin', async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new Error('FORBIDDEN: requires role Admin'),
    );
    await expect(
      inviteUser({
        email: 'x@x.com',
        first_name: 'A',
        last_name: 'B',
        role: 'Client',
      }),
    ).rejects.toThrow('You do not have permission');
  });
});

// ── resendInvite ───────────────────────────────────────────────────────────────

describe('resendInvite()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws if user not in PENDING status', async () => {
    const chain = makeChain({
      data: { id: 'u1', email: 'a@b.com', status: 'ACTIVE', role: 'Client' },
      error: null,
    });
    mockFrom.mockReturnValue(chain);
    await expect(resendInvite('u1')).rejects.toThrow('PENDING');
  });

  it('re-sends via inviteUserByEmail and records audit on success', async () => {
    const selectChain = makeChain({
      data: {
        id: 'u1',
        email: 'a@b.com',
        status: 'PENDING',
        role: 'Client',
        first_name: 'A',
        last_name: 'B',
        manager_id: null,
      },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);
    mockAdminInvite.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });

    await resendInvite('u1');

    expect(mockAdminInvite).toHaveBeenCalledWith(
      'a@b.com',
      expect.objectContaining({
        data: expect.objectContaining({ resent: true }),
        redirectTo: expect.stringContaining('/auth/confirm'),
      }),
    );
    expect(mockAdminGenerateLink).not.toHaveBeenCalled();
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.invite_resent', entityId: 'u1' }),
    );
  });

  it('falls back to generateLink + mailer when inviteUserByEmail fails', async () => {
    const selectChain = makeChain({
      data: {
        id: 'u1',
        email: 'a@b.com',
        status: 'PENDING',
        role: 'Client',
        first_name: 'A',
        last_name: 'B',
        manager_id: null,
      },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);
    mockAdminInvite.mockResolvedValue({
      data: null,
      error: { message: 'User already exists' },
    });
    mockAdminGenerateLink.mockResolvedValue({
      data: { properties: { action_link: 'https://x.test/confirm?token=abc' } },
      error: null,
    });

    await resendInvite('u1');

    expect(mockAdminGenerateLink).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'invite', email: 'a@b.com' }),
    );
    expect(mockMailerSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'a@b.com',
        params: expect.objectContaining({
          invite_link: 'https://x.test/confirm?token=abc',
        }),
      }),
    );
  });
});

// ── editUser ───────────────────────────────────────────────────────────────────

describe('editUser()', () => {
  beforeEach(() => vi.clearAllMocks());

  const currentUser = {
    id: 'u1',
    role: 'Client',
    manager_id: null,
    status: 'ACTIVE',
  };

  it('returns requiresConfirm when role changes and has active orders', async () => {
    const selectChain = makeChain({ data: currentUser, error: null });
    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ count: 2, error: null })),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ count: 0, error: null })),
          })),
        })),
      });

    const result = await editUser('u1', { role: 'Manager' });
    expect(result).toEqual(
      expect.objectContaining({
        requiresConfirm: expect.objectContaining({ activeOrders: 2 }),
      }),
    );
  });

  it('updates user directly when confirmRoleChange is true', async () => {
    const selectChain = makeChain({ data: currentUser, error: null });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);

    const result = await editUser(
      'u1',
      { role: 'Manager' },
      { confirmRoleChange: true },
    );
    expect(result).toEqual({ done: true });
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.edit' }),
    );
  });
});

// ── disableUser ────────────────────────────────────────────────────────────────

describe('disableUser()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns FORBIDDEN_SELF when disabling own account', async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(
      makeAdminUser({ id: 'admin-1' }),
    );
    const result = await disableUser('admin-1', 'some reason');
    expect(result).toEqual({ ok: false, code: 'FORBIDDEN_SELF' });
  });

  it('returns BLOCKING_ORDERS for copywriter with active orders', async () => {
    const blockingOrders = [
      { id: 'ord-1', status: 'In Progress', site_domain: 'foo.com' },
      { id: 'ord-2', status: 'Needs changes', site_domain: 'bar.com' },
    ];
    const inFn = vi
      .fn()
      .mockResolvedValue({ data: blockingOrders, error: null });
    const eqFn = vi.fn().mockReturnValue({ in: inFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });

    const targetChain = makeChain({
      data: { id: 'cw-1', role: 'Copywriter', status: 'ACTIVE' },
      error: null,
    });
    mockFrom
      .mockReturnValueOnce(targetChain)
      .mockReturnValue({ select: selectFn });

    const result = await disableUser('cw-1', 'some reason');
    expect(result).toEqual({
      ok: false,
      code: 'BLOCKING_ORDERS',
      orders: expect.arrayContaining([
        expect.objectContaining({ id: 'ord-1' }),
      ]),
    });
  });

  it('calls disable_sourcer RPC for Sourcer role', async () => {
    const targetChain = makeChain({
      data: { id: 's-1', role: 'Sourcer', status: 'ACTIVE' },
      error: null,
    });
    mockFrom.mockReturnValue(targetChain);
    mockRpc.mockResolvedValue({ error: null });

    const result = await disableUser('s-1', 'leaving company');
    expect(result).toEqual({ ok: true });
    expect(mockRpc).toHaveBeenCalledWith('disable_sourcer', {
      p_user_id: 's-1',
      p_reason: 'leaving company',
    });
  });

  it('updates status directly for non-sourcer non-copywriter roles', async () => {
    const targetChain = makeChain({
      data: { id: 'cl-1', role: 'Client', status: 'ACTIVE' },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(targetChain).mockReturnValue(updateChain);

    const result = await disableUser('cl-1', 'inactive client');
    expect(result).toEqual({ ok: true });
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.disable' }),
    );
  });

  it('rejects reason shorter than 5 chars', async () => {
    await expect(disableUser('u1', 'abc')).rejects.toThrow('5 characters');
  });
});

// ── activateUser ───────────────────────────────────────────────────────────────

describe('activateUser()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets status to ACTIVE and records audit', async () => {
    const selectChain = makeChain({
      data: { id: 'u1', status: 'DISABLED' },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);

    await activateUser('u1');
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.activate', entityId: 'u1' }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'user.activated' }),
    );
  });

  it('throws NOT_FOUND when user does not exist', async () => {
    const chain = makeChain({ data: null, error: { message: 'not found' } });
    mockFrom.mockReturnValue(chain);
    await expect(activateUser('missing')).rejects.toThrow('User not found');
  });
});

// ── Manager actor permissions ──────────────────────────────────────────────────

describe('inviteUser() — Manager actor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('defaults manager_id to actor.id when Manager invites a Client with no pick', async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(makeManagerUser());

    const noUser = makeChain({ data: null, error: null });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(noUser).mockReturnValue(updateChain);

    mockAdminInvite.mockResolvedValue({
      data: { user: { id: 'new-client-1' } },
      error: null,
    });

    await inviteUser({
      email: 'client@test.com',
      first_name: 'C',
      last_name: 'L',
      role: 'Client',
    });

    expect(mockAdminInvite).toHaveBeenCalledWith(
      'client@test.com',
      expect.objectContaining({
        data: expect.objectContaining({ manager_id: 'mgr-1' }),
      }),
    );
  });

  it('honors explicit manager_id when Manager invites a Client', async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(makeManagerUser());

    const noUser = makeChain({ data: null, error: null });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(noUser).mockReturnValue(updateChain);

    mockAdminInvite.mockResolvedValue({
      data: { user: { id: 'new-client-2' } },
      error: null,
    });

    const otherMgr = '11111111-2222-4333-8444-555555555555';
    await inviteUser({
      email: 'client2@test.com',
      first_name: 'C',
      last_name: 'L',
      role: 'Client',
      manager_id: otherMgr,
    });

    expect(mockAdminInvite).toHaveBeenCalledWith(
      'client2@test.com',
      expect.objectContaining({
        data: expect.objectContaining({ manager_id: otherMgr }),
      }),
    );
  });

  it.each(['Copywriter', 'Sourcer'] as const)(
    'succeeds when Manager invites a %s',
    async (role) => {
      vi.mocked(requireRole).mockResolvedValueOnce(makeManagerUser());
      const noUser = makeChain({ data: null, error: null });
      const updateChain = makeChain({ data: null, error: null });
      mockFrom.mockReturnValueOnce(noUser).mockReturnValue(updateChain);
      mockAdminInvite.mockResolvedValue({
        data: { user: { id: 'new-1' } },
        error: null,
      });

      const result = await inviteUser({
        email: `${role}@test.com`,
        first_name: 'X',
        last_name: 'Y',
        role,
      });

      expect(result.userId).toBe('new-1');
    },
  );

  it.each(['Manager', 'Admin'] as const)(
    'throws FORBIDDEN when Manager invites a %s',
    async (role) => {
      vi.mocked(requireRole).mockResolvedValueOnce(makeManagerUser());
      const noUser = makeChain({ data: null, error: null });
      mockFrom.mockReturnValue(noUser);

      await expect(
        inviteUser({
          email: `${role}@test.com`,
          first_name: 'X',
          last_name: 'Y',
          role,
        }),
      ).rejects.toThrow('permission');
      expect(mockAdminInvite).not.toHaveBeenCalled();
    },
  );
});

describe('resendInvite() — Manager actor', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['Client', 'Copywriter', 'Sourcer'] as const)(
    'succeeds for PENDING %s target',
    async (role) => {
      vi.mocked(requireRole).mockResolvedValueOnce(makeManagerUser());
      const selectChain = makeChain({
        data: {
          id: 'u1',
          email: 'a@b.com',
          status: 'PENDING',
          role,
          first_name: 'A',
          last_name: 'B',
          manager_id: null,
        },
        error: null,
      });
      const updateChain = makeChain({ data: null, error: null });
      mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);
      mockAdminInvite.mockResolvedValue({
        data: { user: { id: 'u1' } },
        error: null,
      });

      await resendInvite('u1');
      expect(mockAdminInvite).toHaveBeenCalled();
    },
  );

  it.each(['Manager', 'Admin'] as const)(
    'throws FORBIDDEN when target is %s',
    async (role) => {
      vi.mocked(requireRole).mockResolvedValueOnce(makeManagerUser());
      const selectChain = makeChain({
        data: {
          id: 'u1',
          email: 'a@b.com',
          status: 'PENDING',
          role,
          first_name: 'X',
          last_name: 'Y',
          manager_id: null,
        },
        error: null,
      });
      mockFrom.mockReturnValue(selectChain);

      await expect(resendInvite('u1')).rejects.toThrow('permission');
      expect(mockAdminInvite).not.toHaveBeenCalled();
    },
  );
});

describe('editUser() — Manager actor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('persists name changes for a Client target', async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(makeManagerUser());
    const selectChain = makeChain({
      data: {
        id: 'u1',
        role: 'Client',
        manager_id: 'mgr-1',
        status: 'ACTIVE',
      },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);

    const result = await editUser('u1', {
      first_name: 'New',
      last_name: 'Name',
    });
    expect(result).toEqual({ done: true });
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.edit' }),
    );
  });

  it('rejects a patch that contains a role change', async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(makeManagerUser());
    const selectChain = makeChain({
      data: {
        id: 'u1',
        role: 'Client',
        manager_id: 'mgr-1',
        status: 'ACTIVE',
      },
      error: null,
    });
    mockFrom.mockReturnValue(selectChain);

    await expect(
      editUser('u1', { role: 'Copywriter' }),
    ).rejects.toThrow('role');
  });

  it.each(['Manager', 'Admin'] as const)(
    'throws FORBIDDEN when target is %s',
    async (role) => {
      vi.mocked(requireRole).mockResolvedValueOnce(makeManagerUser());
      const selectChain = makeChain({
        data: { id: 'u1', role, manager_id: null, status: 'ACTIVE' },
        error: null,
      });
      mockFrom.mockReturnValue(selectChain);

      await expect(
        editUser('u1', { first_name: 'X' }),
      ).rejects.toThrow('permission');
    },
  );

  it('allows reassigning a Client they currently manage to another Manager', async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(makeManagerUser());
    const selectChain = makeChain({
      data: {
        id: 'u1',
        role: 'Client',
        manager_id: 'mgr-1',
        status: 'ACTIVE',
      },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);

    const result = await editUser('u1', {
      manager_id: '11111111-2222-4333-8444-555555555555',
    });
    expect(result).toEqual({ done: true });
  });

  it('throws FORBIDDEN reassigning a Client managed by a different Manager', async () => {
    vi.mocked(requireRole).mockResolvedValueOnce(makeManagerUser());
    const selectChain = makeChain({
      data: {
        id: 'u1',
        role: 'Client',
        manager_id: 'other-mgr',
        status: 'ACTIVE',
      },
      error: null,
    });
    mockFrom.mockReturnValue(selectChain);

    await expect(
      editUser('u1', {
        manager_id: '11111111-2222-4333-8444-555555555555',
      }),
    ).rejects.toThrow('permission');
  });
});

describe('editUser() — Admin actor manager reassignment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('allows reassigning any Client to any Manager', async () => {
    const selectChain = makeChain({
      data: {
        id: 'u1',
        role: 'Client',
        manager_id: 'someone-else',
        status: 'ACTIVE',
      },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);

    const result = await editUser('u1', {
      manager_id: '11111111-2222-4333-8444-555555555555',
    });
    expect(result).toEqual({ done: true });
  });
});

describe('disableUser()/activateUser() — Manager actor blocked', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws FORBIDDEN for Manager actor on disableUser', async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new Error('FORBIDDEN: requires role Admin'),
    );
    await expect(disableUser('u1', 'reason xyz')).rejects.toThrow('permission');
  });

  it('throws FORBIDDEN for Manager actor on activateUser', async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new Error('FORBIDDEN: requires role Admin'),
    );
    await expect(activateUser('u1')).rejects.toThrow('permission');
  });
});
