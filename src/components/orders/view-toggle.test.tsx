import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = vi.fn();
let currentSearch = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/dashboard/orders',
  useSearchParams: () => currentSearch,
}));

import { ViewToggle } from './view-toggle';

beforeEach(() => {
  vi.clearAllMocks();
  currentSearch = new URLSearchParams();
});

describe('ViewToggle', () => {
  it('clicking Kanban sets view=kanban and clears all other params', async () => {
    currentSearch = new URLSearchParams('page=3&limit=25&search=foo&status=New&copywriter=cw-1');
    render(<ViewToggle current="list" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /kanban/i }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('/dashboard/orders?');
    const qs = new URLSearchParams(url.split('?')[1] ?? '');
    expect(qs.get('view')).toBe('kanban');
    expect(qs.get('search')).toBeNull();
    expect(qs.get('status')).toBeNull();
    expect(qs.get('copywriter')).toBeNull();
    expect(qs.get('page')).toBeNull();
    expect(qs.get('limit')).toBeNull();
  });

  it('clicking List sets view=list and clears all other params', async () => {
    currentSearch = new URLSearchParams('view=kanban&search=foo&copywriter=cw-1&assignee=unassigned');
    render(<ViewToggle current="kanban" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /list/i }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    const qs = new URLSearchParams(url.split('?')[1] ?? '');
    expect(qs.get('view')).toBe('list');
    expect(qs.get('search')).toBeNull();
    expect(qs.get('copywriter')).toBeNull();
    expect(qs.get('assignee')).toBeNull();
  });

  it('aria-pressed reflects current prop', () => {
    render(<ViewToggle current="kanban" />);
    expect(screen.getByRole('button', { name: /kanban/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /list/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('writes the chosen view to a cookie on click', async () => {
    render(<ViewToggle current="list" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /kanban/i }));
    expect(document.cookie).toMatch(/orders_view=kanban/);
  });

  it('clicking the active view does not push or write a cookie', async () => {
    // ensure cookie starts unset
    document.cookie = 'orders_view=; path=/; max-age=0';
    render(<ViewToggle current="list" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /list/i }));
    expect(mockPush).not.toHaveBeenCalled();
    expect(document.cookie).not.toMatch(/orders_view=/);
  });
});
