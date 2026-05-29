import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OrderRow } from './orders-table';
import { KANBAN_COLUMNS } from './kanban-columns';

const mockFetchOrdersColumn = vi.fn();

vi.mock('@/app/dashboard/orders/actions', () => ({
  fetchOrdersColumn: (...args: unknown[]) => mockFetchOrdersColumn(...args),
}));

import { OrdersKanban } from './orders-kanban';

function makeOrder(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 'order-1',
    site_domain: 'example.com',
    status: 'New',
    price_cents: 5000,
    publish_date: '2026-06-01',
    created_at: '2026-05-01T00:00:00Z',
    copywriter: null,
    manager: null,
    sourcer_payout_cents: null,
    sourcer_paid_at: null,
    ...overrides,
  };
}

function emptyColumns(): Record<string, { rows: OrderRow[]; total: number }> {
  return Object.fromEntries(
    KANBAN_COLUMNS.map((s) => [s, { rows: [], total: 0 }]),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OrdersKanban', () => {
  it('renders all 7 columns in the required order', () => {
    render(
      <OrdersKanban
        initialColumns={emptyColumns() as Parameters<typeof OrdersKanban>[0]['initialColumns']}
        filters={{}}
      />,
    );

    const cols = screen.getAllByTestId('kanban-column');
    expect(cols).toHaveLength(7);
    cols.forEach((col, i) => {
      expect(col).toHaveAttribute('data-status', KANBAN_COLUMNS[i]);
    });
  });

  it('column header shows server-reported total, not rows.length', () => {
    const cols = emptyColumns();
    cols['New'] = { rows: [makeOrder()], total: 42 };
    render(
      <OrdersKanban
        initialColumns={cols as Parameters<typeof OrdersKanban>[0]['initialColumns']}
        filters={{}}
      />,
    );
    const newCol = screen.getAllByTestId('kanban-column').find(
      (el) => el.getAttribute('data-status') === 'New',
    )!;
    expect(within(newCol).getByTestId('kanban-column-total')).toHaveTextContent('42');
  });

  it('hides Load more when rows.length === total', () => {
    const cols = emptyColumns();
    cols['New'] = {
      rows: [makeOrder({ id: 'o1' }), makeOrder({ id: 'o2' })],
      total: 2,
    };
    render(
      <OrdersKanban
        initialColumns={cols as Parameters<typeof OrdersKanban>[0]['initialColumns']}
        filters={{}}
      />,
    );
    const newCol = screen.getByTestId('kanban-column-New');
    expect(within(newCol).queryByRole('button', { name: /load more/i })).toBeNull();
  });

  it('clicking Load more calls action with page+1 and appends rows', async () => {
    const cols = emptyColumns();
    cols['New'] = { rows: [makeOrder({ id: 'o1' })], total: 3 };
    mockFetchOrdersColumn.mockResolvedValueOnce({
      rows: [makeOrder({ id: 'o2' }), makeOrder({ id: 'o3' })],
      total: 3,
    });

    render(
      <OrdersKanban
        initialColumns={cols as Parameters<typeof OrdersKanban>[0]['initialColumns']}
        filters={{ search: 'foo', copywriterId: 'cw-1' }}
      />,
    );
    const newCol = screen.getByTestId('kanban-column-New');
    const btn = within(newCol).getByRole('button', { name: /load more/i });

    const user = userEvent.setup();
    await user.click(btn);

    expect(mockFetchOrdersColumn).toHaveBeenCalledWith({
      status: 'New',
      page: 2,
      pageSize: 25,
      filters: { search: 'foo', copywriterId: 'cw-1' },
    });

    // Both new rows should be visible
    const cards = await within(newCol).findAllByTestId('kanban-card');
    expect(cards).toHaveLength(3);
  });

  it('Load more button is hidden after batch fills the column', async () => {
    const cols = emptyColumns();
    cols['New'] = { rows: [makeOrder({ id: 'o1' })], total: 2 };
    mockFetchOrdersColumn.mockResolvedValueOnce({
      rows: [makeOrder({ id: 'o2' })],
      total: 2,
    });

    render(
      <OrdersKanban
        initialColumns={cols as Parameters<typeof OrdersKanban>[0]['initialColumns']}
        filters={{}}
      />,
    );
    const newCol = screen.getByTestId('kanban-column-New');
    const user = userEvent.setup();
    await user.click(within(newCol).getByRole('button', { name: /load more/i }));

    expect(within(newCol).queryByRole('button', { name: /load more/i })).toBeNull();
  });

  it('each card links to /dashboard/orders/[id]', () => {
    const cols = emptyColumns();
    cols['New'] = { rows: [makeOrder({ id: 'abc-123' })], total: 1 };
    render(
      <OrdersKanban
        initialColumns={cols as Parameters<typeof OrdersKanban>[0]['initialColumns']}
        filters={{}}
      />,
    );
    const link = screen.getByRole('link', { name: /example\.com/i });
    expect(link).toHaveAttribute('href', '/dashboard/orders/abc-123');
  });

  it('when filters.status is set, non-matching columns render Filtered out with no Load more', () => {
    const cols = emptyColumns();
    cols['In Progress'] = { rows: [makeOrder({ id: 'o1', status: 'In Progress' })], total: 5 };
    render(
      <OrdersKanban
        initialColumns={cols as Parameters<typeof OrdersKanban>[0]['initialColumns']}
        filters={{ status: 'In Progress' }}
      />,
    );
    const newCol = screen.getByTestId('kanban-column-New');
    expect(within(newCol).getByText(/filtered out/i)).toBeInTheDocument();
    expect(within(newCol).queryByRole('button', { name: /load more/i })).toBeNull();

    const ipCol = screen.getByTestId('kanban-column-In Progress');
    expect(within(ipCol).queryByText(/filtered out/i)).toBeNull();
  });
});
