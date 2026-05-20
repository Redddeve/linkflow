import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserRow } from '@/lib/auth';

// ── Shared mock state ──────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

const mockRecordAudit = vi.fn();
const mockNotify = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('@/lib/audit', () => ({ recordAudit: mockRecordAudit }));
vi.mock('@/lib/notify', () => ({ notify: mockNotify }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

const makeUser = (overrides: Partial<UserRow> = {}): UserRow => ({
  id: 'user-1',
  email: 'user@test.com',
  role: 'Admin',
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

const mockRequireRole = vi.fn(async () => makeUser());

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return { ...actual, requireRole: mockRequireRole };
});

const {
  sendInvoice,
  markInvoicePaid,
  reassignOrders,
  reassignOrderBillingMonth,
  generateInvoicesForMonth,
} = await import('./actions');

// ── Fluent Supabase stub builder ───────────────────────────────────────────────

type ChainResult = { data: unknown; error: unknown; count?: number };

function makeChain(result: ChainResult) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'maybeSingle', 'single', 'order'];
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  (chain['single'] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  (chain['maybeSingle'] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  // For `select(..., { count: 'exact', head: true })` callers that await the
  // chain directly without `.single()` — return a thenable terminal.
  return chain;
}

const INV_1 = 'b0000001-0000-4000-8000-000000000001';
const INV_2 = 'b0000002-0000-4000-8000-000000000002';
const ORD_1 = 'c0000001-0000-4000-8000-000000000001';
const CLIENT_1 = 'd0000001-0000-4000-8000-000000000001';
const ADMIN_1 = 'e0000001-0000-4000-8000-000000000001';
const MGR_1 = 'e0000002-0000-4000-8000-000000000002';

// Helper: stub `from('invoices').select(...).eq(...).select(..., {count}).eq(...)`.
// `sendInvoice` does two queries: the row, then a count. We make the chain
// configurable per call.
function makeFromQueue(results: ChainResult[]) {
  const chains = results.map(makeChain);
  // The count query reads `chain` directly via thenable from select().eq()
  // — emulate by adding a `then` on every chain that resolves to the result.
  results.forEach((r, i) => {
    const chain = chains[i] as Record<string, unknown>;
    chain.then = (resolve: (v: ChainResult) => unknown) => resolve(r);
  });
  let i = 0;
  return () => chains[i++] ?? makeChain({ data: null, error: null });
}

// ── sendInvoice ────────────────────────────────────────────────────────────────

describe('sendInvoice()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    mockRpc.mockReset();
    mockRequireRole.mockReset();
  });

  it('marks Draft invoice as Sent, audits and notifies client', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: MGR_1, role: 'Manager' }));
    mockFrom.mockImplementation(
      makeFromQueue([
        // 1. Load invoice
        {
          data: { id: INV_1, status: 'Draft', client_id: CLIENT_1, billing_month: '2026-04-01', total_price_cents: 12345 },
          error: null,
        },
        // 2. Count attached orders
        { data: null, error: null, count: 3 },
        // 3. UPDATE invoice
        { data: null, error: null },
      ]),
    );

    await sendInvoice({ invoiceId: INV_1 });

    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'invoice.sent', entityId: INV_1, entityType: 'invoice' }),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: CLIENT_1, type: 'invoice.sent' }),
    );
  });

  it('throws FORBIDDEN when caller is Client', async () => {
    mockRequireRole.mockRejectedValueOnce(new Error('FORBIDDEN: requires role Manager or Admin'));
    await expect(sendInvoice({ invoiceId: INV_1 })).rejects.toThrow('permission');
  });

  it('refuses to send a Draft with $0 total', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: MGR_1, role: 'Manager' }));
    mockFrom.mockImplementation(
      makeFromQueue([
        {
          data: { id: INV_1, status: 'Draft', client_id: CLIENT_1, billing_month: '2026-04-01', total_price_cents: 0 },
          error: null,
        },
      ]),
    );
    await expect(sendInvoice({ invoiceId: INV_1 })).rejects.toThrow('empty invoice');
  });

  it('refuses to send a Draft with zero attached orders', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: MGR_1, role: 'Manager' }));
    mockFrom.mockImplementation(
      makeFromQueue([
        {
          data: { id: INV_1, status: 'Draft', client_id: CLIENT_1, billing_month: '2026-04-01', total_price_cents: 100 },
          error: null,
        },
        { data: null, error: null, count: 0 },
      ]),
    );
    await expect(sendInvoice({ invoiceId: INV_1 })).rejects.toThrow('no attached orders');
  });

  it('throws VALIDATION when invoice is not Draft', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: MGR_1, role: 'Manager' }));
    mockFrom.mockImplementation(
      makeFromQueue([
        {
          data: { id: INV_1, status: 'Sent', client_id: CLIENT_1, billing_month: '2026-04-01', total_price_cents: 100 },
          error: null,
        },
      ]),
    );
    await expect(sendInvoice({ invoiceId: INV_1 })).rejects.toThrow('Sent');
  });
});

// ── markInvoicePaid ────────────────────────────────────────────────────────────

describe('markInvoicePaid()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    mockRpc.mockReset();
    mockRequireRole.mockReset();
  });

  it('marks Sent invoice as Paid, audits and notifies client', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: ADMIN_1, role: 'Admin' }));
    const selectChain = makeChain({
      data: { id: INV_1, status: 'Sent', client_id: CLIENT_1, billing_month: '2026-04-01' },
      error: null,
    });
    const updateChain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValue(updateChain);

    await markInvoicePaid({ invoiceId: INV_1 });

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Paid', marked_as_paid_by_id: ADMIN_1 }),
    );
    expect(updateChain.eq).toHaveBeenCalledWith('status', 'Sent');
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'invoice.paid', entityId: INV_1 }),
    );
  });

  it('throws FORBIDDEN when caller is Manager (Admin-only)', async () => {
    mockRequireRole.mockRejectedValueOnce(new Error('FORBIDDEN: requires role Admin'));
    await expect(markInvoicePaid({ invoiceId: INV_1 })).rejects.toThrow('permission');
  });

  it('throws VALIDATION when invoice is Draft', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: ADMIN_1, role: 'Admin' }));
    const selectChain = makeChain({
      data: { id: INV_1, status: 'Draft', client_id: CLIENT_1, billing_month: '2026-04-01' },
      error: null,
    });
    mockFrom.mockReturnValue(selectChain);
    await expect(markInvoicePaid({ invoiceId: INV_1 })).rejects.toThrow('Draft');
  });
});

// ── reassignOrders (batch RPC) ─────────────────────────────────────────────────

describe('reassignOrders()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    mockRpc.mockReset();
    mockRequireRole.mockReset();
  });

  it('delegates to the reassign_order_billing_months RPC with snake_case payload', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: MGR_1, role: 'Manager' }));
    mockRpc.mockResolvedValueOnce({
      data: { sources_touched: [INV_1], targets_touched: [INV_2] },
      error: null,
    });

    const result = await reassignOrders({
      changes: [{ orderId: ORD_1, billing_month: '2026-05-01' }],
    });

    expect(mockRpc).toHaveBeenCalledWith('reassign_order_billing_months', {
      p_changes: [{ order_id: ORD_1, new_billing_month: '2026-05-01' }],
    });
    expect(result.targets_touched).toEqual([INV_2]);
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'invoice.orders_reassigned' }),
    );
  });

  it('returns early without RPC call when changes is empty', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: MGR_1, role: 'Manager' }));
    // The Zod schema requires min(1), so an empty array fails validation
    // before reaching the early-return. Confirm the error.
    await expect(reassignOrders({ changes: [] })).rejects.toThrow('At least one');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('throws FORBIDDEN when caller is Client', async () => {
    mockRequireRole.mockRejectedValueOnce(new Error('FORBIDDEN: requires role Manager or Admin'));
    await expect(
      reassignOrders({ changes: [{ orderId: ORD_1, billing_month: '2026-05-01' }] }),
    ).rejects.toThrow('permission');
  });

  it('maps RPC source_invoice_not_draft error to a friendly VALIDATION error', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: MGR_1, role: 'Manager' }));
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'source_invoice_not_draft:abc' },
    });
    await expect(
      reassignOrders({ changes: [{ orderId: ORD_1, billing_month: '2026-05-01' }] }),
    ).rejects.toThrow('Only Draft invoices');
  });

  it('rejects malformed billing_month strings at the Zod boundary', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: MGR_1, role: 'Manager' }));
    await expect(
      reassignOrders({ changes: [{ orderId: ORD_1, billing_month: '2026-05-15' }] }),
    ).rejects.toThrow('first day');
  });
});

// ── reassignOrderBillingMonth (legacy single wrapper) ─────────────────────────

describe('reassignOrderBillingMonth() — single wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    mockRpc.mockReset();
    mockRequireRole.mockReset();
  });

  it('wraps a single change and forwards to the batch RPC', async () => {
    mockRequireRole.mockResolvedValue(makeUser({ id: MGR_1, role: 'Manager' }));
    mockRpc.mockResolvedValueOnce({
      data: { sources_touched: [INV_1], targets_touched: [INV_2] },
      error: null,
    });

    await reassignOrderBillingMonth({ orderId: ORD_1, billing_month: '2026-05-01' });

    expect(mockRpc).toHaveBeenCalledWith('reassign_order_billing_months', {
      p_changes: [{ order_id: ORD_1, new_billing_month: '2026-05-01' }],
    });
  });
});

// ── generateInvoicesForMonth ───────────────────────────────────────────────────

describe('generateInvoicesForMonth()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    mockRpc.mockReset();
    mockRequireRole.mockReset();
  });

  it('returns the RPC result and skips notification lookup when nothing was created', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: ADMIN_1, role: 'Admin' }));
    mockRpc.mockResolvedValueOnce({ data: { created: 0, updated: 0 }, error: null });

    const result = await generateInvoicesForMonth({ billing_month: '2026-04-01' });

    expect(result).toEqual({ created: 0, updated: 0 });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('looks up newly-created Drafts and notifies each client', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: ADMIN_1, role: 'Admin' }));
    mockRpc.mockResolvedValueOnce({ data: { created: 2, updated: 0 }, error: null });

    const freshResult: ChainResult = {
      data: [
        { id: INV_1, client_id: CLIENT_1, total_price_cents: 8000 },
        { id: INV_2, client_id: 'd0000002-0000-4000-8000-000000000002', total_price_cents: 7000 },
      ],
      error: null,
    };
    const freshChain = makeChain(freshResult) as Record<string, unknown>;
    // The production code does `.select(...).eq(...).eq(...)` and awaits
    // directly — make the chain thenable so the awaited value is the result.
    freshChain.then = (resolve: (v: ChainResult) => unknown) => resolve(freshResult);
    mockFrom.mockReturnValueOnce(freshChain);

    const result = await generateInvoicesForMonth({ billing_month: '2026-04-01' });

    expect(result.created).toBe(2);
    expect(mockNotify).toHaveBeenCalledTimes(2);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: CLIENT_1, type: 'invoice.generated' }),
    );
  });

  it('counts updated Drafts (orders attached to existing invoice)', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: ADMIN_1, role: 'Admin' }));
    mockRpc.mockResolvedValueOnce({ data: { created: 0, updated: 1 }, error: null });

    const result = await generateInvoicesForMonth({ billing_month: '2026-04-01' });

    expect(result.updated).toBe(1);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('throws FORBIDDEN when caller is not Admin', async () => {
    mockRequireRole.mockRejectedValueOnce(new Error('FORBIDDEN: requires role Admin'));
    await expect(generateInvoicesForMonth({ billing_month: '2026-04-01' })).rejects.toThrow(
      'permission',
    );
  });

  it('rejects malformed billing_month strings', async () => {
    mockRequireRole.mockResolvedValueOnce(makeUser({ id: ADMIN_1, role: 'Admin' }));
    await expect(generateInvoicesForMonth({ billing_month: '2026-04-15' })).rejects.toThrow(
      'first day',
    );
  });
});
