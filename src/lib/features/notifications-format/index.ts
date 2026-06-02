export interface FormattedNotification {
  title: string;
  href: string | null;
}

type Payload = Record<string, unknown>;

function str(payload: unknown, ...keys: string[]): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Payload;
  for (const key of keys) {
    if (key in p) {
      const v = p[key];
      if (typeof v === 'string' && v.length > 0) return v;
    }
  }
  return null;
}

function num(payload: unknown, ...keys: string[]): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Payload;
  for (const key of keys) {
    if (key in p) {
      const v = p[key];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
    }
  }
  return null;
}

function arr(payload: unknown, key: string): unknown[] | null {
  if (!payload || typeof payload !== 'object') return null;
  const v = (payload as Payload)[key];
  return Array.isArray(v) ? v : null;
}

function orderId(payload: unknown): string | null {
  return str(payload, 'orderId', 'order_id');
}

function orderHref(payload: unknown): string {
  const id = orderId(payload);
  return id ? `/dashboard/orders/${id}` : '/dashboard/orders';
}

function siteHref(payload: unknown): string {
  const id = str(payload, 'siteId', 'site_id');
  return id ? `/dashboard/sites/${id}` : '/dashboard/sites';
}

function invoiceHref(payload: unknown): string {
  const id = str(payload, 'invoiceId', 'invoice_id');
  return id ? `/dashboard/invoices/${id}` : '/dashboard/invoices';
}

function chatHref(payload: unknown): string {
  const id = str(payload, 'chatId', 'chat_id');
  return id ? `/dashboard/chat/${id}` : '/dashboard/chat';
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatBillingMonth(value: string | null): string | null {
  if (!value) return null;
  // Accept "YYYY-MM" or full ISO date.
  const match = /^(\d{4})-(\d{2})/.exec(value);
  if (!match) return value;
  const year = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return value;
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${months[monthIdx]} ${year}`;
}

// Humanize a site-action verb (APPROVE, ARCHIVE, REACTIVATE, NEEDS_CHANGES …)
// or a status name into a past-tense description.
function describeSiteTransition(
  toStatus: string | null,
  action: string | null,
): string | null {
  const a = action?.toLowerCase() ?? null;
  if (a === 'approve' || a === 'approved') return 'approved';
  if (a === 'archive' || a === 'archived') return 'archived';
  if (a === 'reactivate' || a === 'reactivated') return 'reactivated';
  if (a === 'needs_changes' || a === 'request_changes')
    return 'marked as needing changes';

  switch (toStatus) {
    case 'Active':
      return 'approved';
    case 'Archived':
      return 'archived';
    case 'Pending':
      return 'moved back to pending';
    default:
      return toStatus ? `set to ${toStatus}` : null;
  }
}

export function formatNotification(
  type: string,
  payload: unknown,
): FormattedNotification {
  switch (type) {
    // ── User account ──────────────────────────────────────────────
    case 'user.invited':
    case 'user.reinvited':
      return {
        title: 'You have been invited to LinkFlow',
        href: '/dashboard',
      };
    case 'user.edited':
      return {
        title: 'Your account details were updated',
        href: '/dashboard/profile',
      };
    case 'user.disabled':
      return { title: 'Your account has been disabled', href: null };
    case 'user.activated':
      return {
        title: 'Your account has been re-activated',
        href: '/dashboard',
      };

    // ── Sites ─────────────────────────────────────────────────────
    case 'site.created':
    case 'site.submitted': {
      const domain = str(payload, 'domain');
      return {
        title: domain
          ? `New site submitted: ${domain}`
          : 'A new site was submitted',
        href: siteHref(payload),
      };
    }

    // The canonical event. Legacy aliases below collapse onto this.
    case 'site.status_changed':
    case 'site.approve':
    case 'site.approved':
    case 'site.archive':
    case 'site.archived':
    case 'site.reactivate':
    case 'site.reactivated':
    case 'site.needs_changes':
    case 'site.request_changes': {
      const domain = str(payload, 'domain');
      const to = str(payload, 'to_status', 'toStatus', 'status');
      // For alias types, derive the action from the type tail.
      const aliasAction =
        type === 'site.status_changed' ? null : type.slice('site.'.length);
      const action = str(payload, 'action') ?? aliasAction;
      const verb = describeSiteTransition(to, action);
      const subject = domain ? `Site ${domain}` : 'A site';
      return {
        title: verb ? `${subject} was ${verb}` : `${subject} status changed`,
        href: siteHref(payload),
      };
    }

    // ── Orders ────────────────────────────────────────────────────
    case 'order.created': {
      const ids = arr(payload, 'orderIds');
      const single =
        ids && ids.length === 1 && typeof ids[0] === 'string'
          ? (ids[0] as string)
          : orderId(payload);
      if (single) {
        return {
          title: 'A new order is awaiting assignment',
          href: `/dashboard/orders/${single}`,
        };
      }
      const count = ids?.length ?? null;
      return {
        title:
          count && count > 1
            ? `${count} new orders are awaiting assignment`
            : 'A new order is awaiting assignment',
        href: '/dashboard/orders',
      };
    }
    case 'order.assigned': {
      const reassigned = (payload as Payload | null)?.reassigned === true;
      return {
        title: reassigned
          ? 'You have been reassigned to an order'
          : 'You have been assigned to an order',
        href: orderHref(payload),
      };
    }
    case 'order.reassigned_away':
      return {
        title: 'You have been removed from an order',
        href: orderHref(payload),
      };
    case 'order.in_progress':
      return {
        title: 'An order is now in progress',
        href: orderHref(payload),
      };
    case 'order.publish_date_changed': {
      const date = str(payload, 'publish_date', 'publishDate');
      return {
        title: date
          ? `An order's publish date was changed to ${date}`
          : "An order's publish date has changed",
        href: orderHref(payload),
      };
    }
    case 'order.content_sent':
      return {
        title: 'Content is ready for your review',
        href: orderHref(payload),
      };
    case 'order.content_approved':
      return {
        title: 'Order content has been approved',
        href: orderHref(payload),
      };
    case 'order.needs_changes':
    case 'change_request.created': {
      const comment = str(payload, 'comment');
      return {
        title: comment
          ? `Changes requested: ${truncate(comment, 80)}`
          : 'An order needs changes',
        href: orderHref(payload),
      };
    }
    case 'order.canceled': {
      const reason = str(payload, 'reason');
      return {
        title: reason
          ? `An order was canceled — ${truncate(reason, 80)}`
          : 'An order was canceled',
        href: orderHref(payload),
      };
    }
    case 'order.comment_added':
      return {
        title: 'A new comment was posted on an order',
        href: orderHref(payload),
      };
    case 'order.published': {
      const url = str(payload, 'published_url', 'publishedUrl');
      return {
        title: url
          ? `Your order has been published at ${url}`
          : 'Your order has been published',
        href: orderHref(payload),
      };
    }
    case 'order.payout_paid': {
      const amount = num(payload, 'amount_cents', 'amountCents');
      const ref = str(payload, 'payout_reference', 'payoutReference');
      const amountStr = amount != null ? formatCents(amount) : null;
      let title = 'A sourcer payout has been marked paid';
      if (amountStr && ref) title = `Payout of ${amountStr} marked paid (${ref})`;
      else if (amountStr) title = `Payout of ${amountStr} marked paid`;
      else if (ref) title = `Sourcer payout marked paid (${ref})`;
      const id = orderId(payload);
      return {
        title,
        href: id ? `/dashboard/orders/${id}` : '/dashboard/earnings',
      };
    }

    // ── Invoices ──────────────────────────────────────────────────
    case 'invoice.generated':
    case 'invoice.sent': {
      const month = formatBillingMonth(str(payload, 'billing_month', 'billingMonth'));
      return {
        title: month
          ? `Your ${month} invoice is available`
          : 'A new invoice is available',
        href: invoiceHref(payload),
      };
    }
    case 'invoice.paid': {
      const month = formatBillingMonth(str(payload, 'billing_month', 'billingMonth'));
      return {
        title: month
          ? `Your ${month} invoice was marked paid`
          : 'An invoice has been marked paid',
        href: invoiceHref(payload),
      };
    }
    case 'invoice.overdue': {
      const month = formatBillingMonth(str(payload, 'billing_month', 'billingMonth'));
      return {
        title: month
          ? `Your ${month} invoice is overdue`
          : 'An invoice is overdue',
        href: invoiceHref(payload),
      };
    }

    // ── Chat ──────────────────────────────────────────────────────
    case 'chat.created':
      return {
        title: 'You were added to a new chat',
        href: chatHref(payload),
      };
    case 'chat.participant_added':
      return {
        title: 'You were added to a chat',
        href: chatHref(payload),
      };
    case 'chat.message_sent': {
      const sender = str(payload, 'senderName', 'sender_name', 'from');
      const preview = str(payload, 'preview', 'body');
      if (sender && preview)
        return {
          title: `${sender}: ${truncate(preview, 80)}`,
          href: chatHref(payload),
        };
      if (sender)
        return {
          title: `New message from ${sender}`,
          href: chatHref(payload),
        };
      return { title: 'You have a new message', href: chatHref(payload) };
    }

    default:
      return { title: humanizeUnknownType(type), href: null };
  }
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

// Last-resort prettifier for an unrecognized event so the user never sees
// raw `domain.snake_case` strings in the notification center.
function humanizeUnknownType(type: string): string {
  const [, tail] = type.split('.', 2);
  const base = (tail ?? type).replace(/_/g, ' ').trim();
  if (!base) return type;
  return base.charAt(0).toUpperCase() + base.slice(1);
}
