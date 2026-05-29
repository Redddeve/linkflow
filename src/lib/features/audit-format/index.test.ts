import { describe, expect, it } from 'vitest';
import { formatAuditAction } from './index';

describe('formatAuditAction', () => {
  it('handles known actions', () => {
    expect(formatAuditAction('order.create', null, null)).toBe('Order created');
    expect(formatAuditAction('order.publish', null, null)).toBe(
      'Order published',
    );
    expect(formatAuditAction('order.approve', null, null)).toBe(
      'Content approved',
    );
    expect(formatAuditAction('order.rejected', null, null)).toBe(
      'Content rejected — needs changes',
    );
  });

  it('formats publish-date changes with the new date', () => {
    expect(
      formatAuditAction(
        'order.edit_publish_date',
        { publish_date: '2026-04-01' },
        { publish_date: '2026-05-15' },
      ),
    ).toBe('Publish date changed to 2026-05-15');
  });

  it('falls back to a status diff for unknown actions', () => {
    expect(
      formatAuditAction(
        'order.weird',
        { status: 'New' },
        { status: 'In Progress' },
      ),
    ).toBe('Status changed: New → In Progress');
  });

  it('falls back to the raw action when no status diff is available', () => {
    expect(formatAuditAction('order.weird', null, null)).toBe('order.weird');
  });
});
