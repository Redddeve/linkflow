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
  it('clicking Kanban sets view=kanban and drops page/limit', async () => {
    currentSearch = new URLSearchParams('page=3&limit=25&search=foo');
    render(<ViewToggle current="list" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /kanban/i }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    expect(url).toContain('/dashboard/orders?');
    const qs = new URLSearchParams(url.split('?')[1] ?? '');
    expect(qs.get('view')).toBe('kanban');
    expect(qs.get('search')).toBe('foo');
    expect(qs.get('page')).toBeNull();
    expect(qs.get('limit')).toBeNull();
  });

  it('clicking List sets view=list and preserves other params', async () => {
    currentSearch = new URLSearchParams('view=kanban&search=foo&copywriter=cw-1');
    render(<ViewToggle current="kanban" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /list/i }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;
    const qs = new URLSearchParams(url.split('?')[1] ?? '');
    expect(qs.get('view')).toBe('list');
    expect(qs.get('search')).toBe('foo');
    expect(qs.get('copywriter')).toBe('cw-1');
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
});
