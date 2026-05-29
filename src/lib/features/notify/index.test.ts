import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();
const mockPrefSingle = vi.fn();

const prefsChain = {
  select: vi.fn(() => prefsChain),
  eq: vi.fn(() => prefsChain),
  single: mockPrefSingle,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => prefsChain),
    rpc: mockRpc,
  })),
}));

const { notify } = await import('.');

describe('notify()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ error: null });
  });

  it.each(['IN_APP', 'EMAIL', 'BOTH'] as const)(
    'inserts an in-app row regardless of channel (%s)',
    async (channel) => {
      mockPrefSingle.mockResolvedValueOnce({ data: { channel } });

      await notify({
        recipientId: 'u1',
        type: 'order.created',
        payload: { order_id: 'o1' },
      });

      expect(mockRpc).toHaveBeenCalledTimes(1);
      expect(mockRpc).toHaveBeenCalledWith(
        'insert_notification',
        expect.objectContaining({
          p_recipient_id: 'u1',
          p_type: 'order.created',
          p_channel: channel,
        }),
      );
    },
  );

  it('falls back to IN_APP when no preference row exists', async () => {
    mockPrefSingle.mockResolvedValueOnce({ data: null });

    await notify({
      recipientId: 'u1',
      type: 'order.created',
      payload: {},
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'insert_notification',
      expect.objectContaining({ p_channel: 'IN_APP' }),
    );
  });

  it('logs but does not throw on RPC error', async () => {
    mockPrefSingle.mockResolvedValueOnce({ data: null });
    mockRpc.mockResolvedValueOnce({ error: { message: 'boom' } });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      notify({ recipientId: 'u1', type: 'x', payload: {} }),
    ).resolves.toBeUndefined();
    expect(err).toHaveBeenCalled();
  });
});
