import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserRow } from '@/lib/auth';

const mockFetchOrdersList = vi.fn();
const mockFetchUsersByIds = vi.fn();
const mockRequireUser = vi.fn();

vi.mock('@/lib/data/orders', () => ({
  fetchOrdersList: mockFetchOrdersList,
}));
vi.mock('@/lib/data/users', () => ({
  fetchUsersByIds: mockFetchUsersByIds,
}));
vi.mock('@/lib/audit', () => ({ recordAudit: vi.fn() }));
vi.mock('@/lib/notify', () => ({ notify: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: vi.fn(), rpc: vi.fn() })),
}));

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return { ...actual, requireUser: mockRequireUser };
});

const makeUser = (overrides: Partial<UserRow> = {}): UserRow => ({
  id: 'user-1',
  email: 'user@test.com',
  role: 'Client',
  status: 'ACTIVE',
  first_name: 'Test',
  last_name: 'User',
  manager_id: null,
  created_by_id: null,
  invited_at: null,
  disabled_reason: null,
  avatar: null,
  ...overrides,
});

const { fetchOrdersColumn } = await import('./actions');

const CLIENT_1 = 'a0000007-0000-4000-8000-000000000007';
const MGR_1 = 'a0000006-0000-4000-8000-000000000006';
const CW_1 = 'a0000002-0000-4000-8000-000000000002';
const ORD_1 = 'a0000001-0000-4000-8000-000000000001';

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchOrdersList.mockResolvedValue({ rows: [], total: 0 });
  mockFetchUsersByIds.mockResolvedValue([]);
});

describe('fetchOrdersColumn()', () => {
  it('Client sees only own orders (createdById scoped to actor)', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: CLIENT_1, role: 'Client' }),
    );
    await fetchOrdersColumn({
      status: 'New',
      page: 1,
      pageSize: 25,
      filters: {},
    });
    expect(mockFetchOrdersList).toHaveBeenCalledWith(
      expect.objectContaining({
        createdById: CLIENT_1,
        status: 'New',
        page: 1,
        pageSize: 25,
        excludeDisabledCreators: true,
      }),
    );
    // copywriterId/unassigned must not be applied for Client
    const call = mockFetchOrdersList.mock.calls[0][0];
    expect(call.copywriterId).toBeUndefined();
    expect(call.unassigned).toBeFalsy();
  });

  it('Manager passes copywriterId, search, and unassigned through verbatim', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );
    await fetchOrdersColumn({
      status: 'In Progress',
      page: 2,
      pageSize: 25,
      filters: {
        copywriterId: CW_1,
        search: 'example.com',
        unassigned: true,
      },
    });
    expect(mockFetchOrdersList).toHaveBeenCalledWith(
      expect.objectContaining({
        copywriterId: CW_1,
        search: 'example.com',
        unassigned: true,
        status: 'In Progress',
        page: 2,
        pageSize: 25,
      }),
    );
    // Manager must NOT have createdById set
    const call = mockFetchOrdersList.mock.calls[0][0];
    expect(call.createdById).toBeUndefined();
  });

  it('Admin passes filters through verbatim and is not createdById-scoped', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: 'admin-1', role: 'Admin' }),
    );
    await fetchOrdersColumn({
      status: 'Published',
      page: 1,
      pageSize: 25,
      filters: { copywriterId: CW_1 },
    });
    const call = mockFetchOrdersList.mock.calls[0][0];
    expect(call.createdById).toBeUndefined();
    expect(call.copywriterId).toBe(CW_1);
  });

  it('Sourcer is forbidden', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser({ role: 'Sourcer' }));
    await expect(
      fetchOrdersColumn({ status: 'New', page: 1, pageSize: 25, filters: {} }),
    ).rejects.toThrow(/permission|FORBIDDEN/i);
  });

  it('Copywriter is forbidden', async () => {
    mockRequireUser.mockResolvedValueOnce(makeUser({ role: 'Copywriter' }));
    await expect(
      fetchOrdersColumn({ status: 'New', page: 1, pageSize: 25, filters: {} }),
    ).rejects.toThrow(/permission|FORBIDDEN/i);
  });

  it('rejects status not in KANBAN_COLUMNS (e.g. Completed)', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );
    await expect(
      fetchOrdersColumn({
        status: 'Completed',
        page: 1,
        pageSize: 25,
        filters: {},
      }),
    ).rejects.toThrow(/status/i);
    expect(mockFetchOrdersList).not.toHaveBeenCalled();
  });

  it('enriches rows with copywriter/manager names', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );
    mockFetchOrdersList.mockResolvedValueOnce({
      rows: [
        {
          id: ORD_1,
          site_domain: 'example.com',
          status: 'In Progress',
          price_cents: 5000,
          publish_date: '2026-06-01',
          published_at: null,
          created_at: '2026-05-01T00:00:00Z',
          created_by_id: CLIENT_1,
          copywriter_id: CW_1,
          manager_id: MGR_1,
          sourcer_payout_cents: null,
          sourcer_paid_at: null,
        },
      ],
      total: 1,
    });
    mockFetchUsersByIds.mockResolvedValueOnce([
      {
        id: CW_1,
        first_name: 'Carla',
        last_name: 'Writer',
        role: 'Copywriter',
        status: 'ACTIVE',
      },
      {
        id: MGR_1,
        first_name: 'Mark',
        last_name: 'Manager',
        role: 'Manager',
        status: 'ACTIVE',
      },
    ]);

    const result = await fetchOrdersColumn({
      status: 'In Progress',
      page: 1,
      pageSize: 25,
      filters: {},
    });

    expect(result.total).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: ORD_1,
      site_domain: 'example.com',
      copywriter: { first_name: 'Carla', last_name: 'Writer' },
      manager: { first_name: 'Mark', last_name: 'Manager' },
    });
    // fetchUsersByIds called with the union of user ids on this batch
    expect(mockFetchUsersByIds).toHaveBeenCalledWith(
      expect.arrayContaining([CW_1, MGR_1, CLIENT_1]),
    );
  });

  it('propagates total from fetchOrdersList unchanged', async () => {
    mockRequireUser.mockResolvedValueOnce(
      makeUser({ id: MGR_1, role: 'Manager' }),
    );
    mockFetchOrdersList.mockResolvedValueOnce({ rows: [], total: 142 });
    const result = await fetchOrdersColumn({
      status: 'New',
      page: 1,
      pageSize: 25,
      filters: {},
    });
    expect(result.total).toBe(142);
    expect(result.rows).toEqual([]);
  });
});
