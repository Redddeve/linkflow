export interface FormattedNotification {
  title: string;
  href: string | null;
}

type Payload = Record<string, unknown>;

function s(payload: unknown, key: string): string | null {
  if (payload && typeof payload === 'object' && key in payload) {
    const v = (payload as Payload)[key];
    return typeof v === 'string' ? v : null;
  }
  return null;
}

export function formatNotification(
  type: string,
  payload: unknown,
): FormattedNotification {
  switch (type) {
    case 'user.invited':
      return {
        title: 'You have been invited to LinkFlow',
        href: '/dashboard',
      };
    case 'user.edited':
      return { title: 'Your account details were updated', href: '/dashboard/profile' };
    case 'user.disabled':
      return { title: 'Your account has been disabled', href: null };
    case 'user.activated':
      return { title: 'Your account has been re-activated', href: '/dashboard' };

    case 'site.created': {
      const domain = s(payload, 'domain');
      const siteId = s(payload, 'site_id');
      return {
        title: domain
          ? `New site submitted: ${domain}`
          : 'A new site was submitted',
        href: siteId ? `/dashboard/sites/${siteId}` : '/dashboard/sites',
      };
    }
    case 'site.status_changed': {
      const domain = s(payload, 'domain');
      const to = s(payload, 'to_status');
      const siteId = s(payload, 'site_id');
      return {
        title:
          domain && to
            ? `Site ${domain} status changed to ${to}`
            : 'A site status changed',
        href: siteId ? `/dashboard/sites/${siteId}` : '/dashboard/sites',
      };
    }

    case 'order.created':
      return { title: 'A new order is awaiting assignment', href: '/dashboard/orders' };
    case 'order.assigned': {
      const orderId = s(payload, 'orderId') ?? s(payload, 'order_id');
      return {
        title: 'You have been assigned to an order',
        href: orderId ? `/dashboard/orders/${orderId}` : '/dashboard/orders',
      };
    }
    case 'order.reassigned_away': {
      const orderId = s(payload, 'orderId') ?? s(payload, 'order_id');
      return {
        title: 'You have been removed from an order',
        href: orderId ? `/dashboard/orders/${orderId}` : '/dashboard/orders',
      };
    }
    case 'order.in_progress': {
      const orderId = s(payload, 'orderId') ?? s(payload, 'order_id');
      return {
        title: 'An order is now in progress',
        href: orderId ? `/dashboard/orders/${orderId}` : '/dashboard/orders',
      };
    }
    case 'order.publish_date_changed': {
      const orderId = s(payload, 'orderId') ?? s(payload, 'order_id');
      return {
        title: 'The publish date for an order has changed',
        href: orderId ? `/dashboard/orders/${orderId}` : '/dashboard/orders',
      };
    }
    case 'order.content_sent': {
      const orderId = s(payload, 'orderId') ?? s(payload, 'order_id');
      return {
        title: 'Content is ready for your review',
        href: orderId ? `/dashboard/orders/${orderId}` : '/dashboard/orders',
      };
    }
    case 'order.content_approved': {
      const orderId = s(payload, 'orderId') ?? s(payload, 'order_id');
      return {
        title: 'Order content has been approved',
        href: orderId ? `/dashboard/orders/${orderId}` : '/dashboard/orders',
      };
    }
    case 'order.needs_changes':
    case 'change_request.created': {
      const orderId = s(payload, 'orderId') ?? s(payload, 'order_id');
      return {
        title: 'An order needs changes',
        href: orderId ? `/dashboard/orders/${orderId}` : '/dashboard/orders',
      };
    }
    case 'order.canceled': {
      const orderId = s(payload, 'orderId') ?? s(payload, 'order_id');
      return {
        title: 'An order was canceled',
        href: orderId ? `/dashboard/orders/${orderId}` : '/dashboard/orders',
      };
    }
    case 'order.comment_added': {
      const orderId = s(payload, 'orderId') ?? s(payload, 'order_id');
      return {
        title: 'A new comment was posted on an order',
        href: orderId ? `/dashboard/orders/${orderId}` : '/dashboard/orders',
      };
    }
    case 'order.published': {
      const orderId = s(payload, 'orderId') ?? s(payload, 'order_id');
      return {
        title: 'Your order has been published',
        href: orderId ? `/dashboard/orders/${orderId}` : '/dashboard/orders',
      };
    }
    case 'order.payout_paid': {
      const orderId = s(payload, 'orderId') ?? s(payload, 'order_id');
      return {
        title: 'A sourcer payout has been marked paid',
        href: orderId ? `/dashboard/orders/${orderId}` : '/dashboard/earnings',
      };
    }

    case 'invoice.generated':
    case 'invoice.sent': {
      const invoiceId = s(payload, 'invoiceId') ?? s(payload, 'invoice_id');
      return {
        title: 'A new invoice is available',
        href: invoiceId ? `/dashboard/invoices/${invoiceId}` : '/dashboard/invoices',
      };
    }
    case 'invoice.paid': {
      const invoiceId = s(payload, 'invoiceId') ?? s(payload, 'invoice_id');
      return {
        title: 'An invoice has been marked paid',
        href: invoiceId ? `/dashboard/invoices/${invoiceId}` : '/dashboard/invoices',
      };
    }

    case 'chat.created':
    case 'chat.participant_added':
    case 'chat.message_sent': {
      const chatId = s(payload, 'chatId') ?? s(payload, 'chat_id');
      return {
        title:
          type === 'chat.message_sent'
            ? 'You have a new message'
            : 'You were added to a chat',
        href: chatId ? `/dashboard/chat/${chatId}` : '/dashboard/chat',
      };
    }

    default:
      return { title: type, href: null };
  }
}
