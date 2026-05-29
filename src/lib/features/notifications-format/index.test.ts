import { describe, expect, it } from 'vitest';
import { formatNotification } from './index';

describe('formatNotification', () => {
  it('builds a link to the site for site.created', () => {
    const r = formatNotification('site.created', {
      site_id: 'abc',
      domain: 'example.com',
    });
    expect(r.title).toContain('example.com');
    expect(r.href).toBe('/dashboard/sites/abc');
  });

  it('handles site.status_changed with both domain and to_status', () => {
    const r = formatNotification('site.status_changed', {
      site_id: 'abc',
      domain: 'example.com',
      to_status: 'Active',
    });
    expect(r.title).toBe('Site example.com status changed to Active');
    expect(r.href).toBe('/dashboard/sites/abc');
  });

  it('links order events to the order detail page', () => {
    const r = formatNotification('order.assigned', { orderId: 'o1' });
    expect(r.href).toBe('/dashboard/orders/o1');
  });

  it('maps change_request.created to the order page', () => {
    const r = formatNotification('change_request.created', {
      orderId: 'o2',
      comment: 'fix anchor',
    });
    expect(r.href).toBe('/dashboard/orders/o2');
  });

  it('falls back to the raw type when unknown', () => {
    const r = formatNotification('weird.unknown', {});
    expect(r.title).toBe('weird.unknown');
    expect(r.href).toBeNull();
  });
});
