import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();
const mockGetClaims = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getClaims: mockGetClaims },
    rpc: mockRpc,
  })),
}));

// Import after mocks are set up
const { recordAudit } = await import('.');

describe('recordAudit()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'actor-uuid' } } });
    mockRpc.mockResolvedValue({ error: null });
  });

  it('calls insert_audit_log RPC with correct params', async () => {
    await recordAudit({
      entityType: 'user',
      entityId: 'entity-uuid',
      action: 'user.invite',
      before: null,
      after: { role: 'Client' },
    });

    expect(mockRpc).toHaveBeenCalledWith('insert_audit_log', {
      p_actor_id: 'actor-uuid',
      p_entity_type: 'user',
      p_entity_id: 'entity-uuid',
      p_action: 'user.invite',
      p_before: null,
      p_after: { role: 'Client' },
    });
  });

  it('does not throw when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'DB error' } });
    await expect(
      recordAudit({ entityType: 'user', entityId: 'x', action: 'test' })
    ).resolves.toBeUndefined();
  });

  it('uses null actor_id when unauthenticated', async () => {
    mockGetClaims.mockResolvedValue({ data: null });
    await recordAudit({ entityType: 'user', entityId: 'x', action: 'test' });
    expect(mockRpc).toHaveBeenCalledWith(
      'insert_audit_log',
      expect.objectContaining({ p_actor_id: '' })
    );
  });
});
