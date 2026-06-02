type Json = unknown;

function field(v: Json, key: string): string | null {
  if (v && typeof v === 'object' && key in v) {
    const x = (v as Record<string, unknown>)[key];
    if (typeof x === 'string') return x;
    if (typeof x === 'number') return String(x);
    if (x === null) return null;
  }
  return null;
}

export function formatAuditAction(
  action: string,
  before: Json,
  after: Json,
): string {
  switch (action) {
    case 'order.create':
      return 'Order created';
    case 'order.assign_copywriter': {
      const cw = field(after, 'copywriter_id');
      return cw
        ? `Copywriter assigned`
        : 'Copywriter assignment cleared';
    }
    case 'order.reassign_copywriter':
      return 'Copywriter reassigned';
    case 'order.edit_publish_date': {
      const next = field(after, 'publish_date');
      return next
        ? `Publish date changed to ${next}`
        : 'Publish date updated';
    }
    case 'order.save_content':
      return 'Content draft saved';
    case 'order.submit_content':
      return 'Content submitted for review';
    case 'order.approve':
      return 'Content approved';
    case 'order.rejected':
      return 'Content rejected — needs changes';
    case 'order.publish':
      return 'Order published';
    case 'order.cancel':
      return 'Order canceled';
    case 'order.add_comment':
      return 'Comment added';
    case 'order.payout_paid':
    case 'order.payout_marked_paid':
      return 'Sourcer payout marked paid';
    case 'order.payout_marked_unpaid':
      return 'Sourcer payout marked unpaid';
    default: {
      const fromStatus = field(before, 'status');
      const toStatus = field(after, 'status');
      if (fromStatus && toStatus) {
        return `Status changed: ${fromStatus} → ${toStatus}`;
      }
      return action;
    }
  }
}
