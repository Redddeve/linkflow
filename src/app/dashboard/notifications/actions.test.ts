import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/features/auth', () => ({
  requireUser: vi.fn(async () => ({ id: 'me' })),
}));

const { markNotificationRead, markAllNotificationsRead } = await import(
  './actions'
);

function makeUpdateChain(
  result: { error: { message: string } | null } = { error: null },
) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.is = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe('markNotificationRead()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('scopes the update to the current user and only unread rows', async () => {
    const chain = makeUpdateChain();
    mockFrom.mockReturnValue(chain);

    await markNotificationRead('n1');

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ read_at: expect.any(String) }),
    );
    expect(chain.eq).toHaveBeenCalledWith('id', 'n1');
    expect(chain.eq).toHaveBeenCalledWith('recipient_id', 'me');
    expect(chain.is).toHaveBeenCalledWith('read_at', null);
  });

  it('throws on supabase error', async () => {
    const chain = makeUpdateChain({ error: { message: 'boom' } });
    mockFrom.mockReturnValue(chain);

    await expect(markNotificationRead('n1')).rejects.toThrow('boom');
  });
});

describe('markAllNotificationsRead()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates every unread row for the current user', async () => {
    const chain = makeUpdateChain();
    mockFrom.mockReturnValue(chain);

    await markAllNotificationsRead();

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ read_at: expect.any(String) }),
    );
    expect(chain.eq).toHaveBeenCalledWith('recipient_id', 'me');
    expect(chain.is).toHaveBeenCalledWith('read_at', null);
  });
});
