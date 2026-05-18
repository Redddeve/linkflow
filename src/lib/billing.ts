/**
 * YYYY-MM-01 string. `billing_month` in the DB is stored as a `date` whose day
 * is always the first of the month — invoices group orders by this key.
 */
export type BillingMonth = string;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function firstOfMonth(date: Date): BillingMonth {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

export function addMonths(month: BillingMonth, delta: number): BillingMonth {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return firstOfMonth(d);
}

export function formatBillingMonth(month: BillingMonth): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function isValidBillingMonth(value: string): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && firstOfMonth(d) === value;
}
