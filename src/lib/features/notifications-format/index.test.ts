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

  it('humanizes site.status_changed using to_status', () => {
    const r = formatNotification('site.status_changed', {
      site_id: 'abc',
      domain: 'example.com',
      to_status: 'Active',
    });
    expect(r.title).toBe('Site example.com was approved');
    expect(r.href).toBe('/dashboard/sites/abc');
  });

  it('archives read as past tense', () => {
    const r = formatNotification('site.status_changed', {
      site_id: 'abc',
      domain: 'example.com',
      to_status: 'Archived',
    });
    expect(r.title).toBe('Site example.com was archived');
  });

  it('collapses legacy site.approve alias onto the canonical phrasing', () => {
    const r = formatNotification('site.approve', {
      site_id: 'abc',
      domain: 'example.com',
    });
    expect(r.title).toBe('Site example.com was approved');
    expect(r.href).toBe('/dashboard/sites/abc');
  });

  it('collapses legacy site.needs_changes alias onto the canonical phrasing', () => {
    const r = formatNotification('site.needs_changes', {
      site_id: 'abc',
      domain: 'example.com',
    });
    expect(r.title).toBe('Site example.com was marked as needing changes');
    expect(r.href).toBe('/dashboard/sites/abc');
  });

  it('links order events to the order detail page', () => {
    const r = formatNotification('order.assigned', { orderId: 'o1' });
    expect(r.href).toBe('/dashboard/orders/o1');
    expect(r.title).toBe('You have been assigned to an order');
  });

  it('reports reassignment differently from a fresh assignment', () => {
    const r = formatNotification('order.assigned', {
      orderId: 'o1',
      reassigned: true,
    });
    expect(r.title).toBe('You have been reassigned to an order');
  });

  it('points order.created at the single order when only one id is in the payload', () => {
    const r = formatNotification('order.created', { orderIds: ['o9'] });
    expect(r.href).toBe('/dashboard/orders/o9');
  });

  it('pluralizes order.created for multi-order checkouts', () => {
    const r = formatNotification('order.created', {
      orderIds: ['o1', 'o2', 'o3'],
    });
    expect(r.title).toBe('3 new orders are awaiting assignment');
    expect(r.href).toBe('/dashboard/orders');
  });

  it('includes the published URL when order.published carries one', () => {
    const r = formatNotification('order.published', {
      orderId: 'o1',
      published_url: 'https://example.com/post',
    });
    expect(r.title).toContain('https://example.com/post');
    expect(r.href).toBe('/dashboard/orders/o1');
  });

  it('formats payout amounts as money', () => {
    const r = formatNotification('order.payout_paid', {
      orderId: 'o1',
      amount_cents: 12500,
      payout_reference: 'TX-1',
    });
    expect(r.title).toBe('Payout of $125.00 marked paid (TX-1)');
    expect(r.href).toBe('/dashboard/orders/o1');
  });

  it('humanizes the billing month on invoice notifications', () => {
    const r = formatNotification('invoice.sent', {
      invoice_id: 'inv1',
      billing_month: '2026-05',
    });
    expect(r.title).toBe('Your May 2026 invoice is available');
    expect(r.href).toBe('/dashboard/invoices/inv1');
  });

  it('maps change_request.created to the order page with the comment preview', () => {
    const r = formatNotification('change_request.created', {
      orderId: 'o2',
      comment: 'fix anchor',
    });
    expect(r.href).toBe('/dashboard/orders/o2');
    expect(r.title).toContain('fix anchor');
  });

  it('formats chat messages with sender and preview when available', () => {
    const r = formatNotification('chat.message_sent', {
      chatId: 'c1',
      senderName: 'Alice',
      preview: 'Hello there',
    });
    expect(r.title).toBe('Alice: Hello there');
    expect(r.href).toBe('/dashboard/chat/c1');
  });

  it('humanizes the fallback for an unknown event so users never see snake_case', () => {
    const r = formatNotification('weird.unknown_thing', {});
    expect(r.title).toBe('Unknown thing');
    expect(r.href).toBeNull();
  });
});
