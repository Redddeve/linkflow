import { describe, it, expect } from 'vitest';
import { firstOfMonth, formatBillingMonth, addMonths, isValidBillingMonth } from '.';

describe('firstOfMonth()', () => {
  it('returns first day of the same month for a mid-month date', () => {
    expect(firstOfMonth(new Date(Date.UTC(2026, 4, 18)))).toBe('2026-05-01');
  });

  it('returns the same date when given the first of a month', () => {
    expect(firstOfMonth(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-01-01');
  });

  it('handles last day of December correctly', () => {
    expect(firstOfMonth(new Date(Date.UTC(2026, 11, 31)))).toBe('2026-12-01');
  });

  it('handles leap-year February correctly', () => {
    expect(firstOfMonth(new Date(Date.UTC(2024, 1, 29)))).toBe('2024-02-01');
  });

  it('uses UTC, not local time', () => {
    // 2026-01-01T00:30:00Z is still Jan 1 in UTC even in negative-offset zones
    expect(firstOfMonth(new Date('2026-01-01T00:30:00Z'))).toBe('2026-01-01');
  });
});

describe('addMonths()', () => {
  it('adds positive months', () => {
    expect(addMonths('2026-05-01', 1)).toBe('2026-06-01');
    expect(addMonths('2026-05-01', 7)).toBe('2026-12-01');
  });

  it('rolls over the year on positive addition', () => {
    expect(addMonths('2026-12-01', 1)).toBe('2027-01-01');
  });

  it('subtracts months with negative values', () => {
    expect(addMonths('2026-05-01', -1)).toBe('2026-04-01');
    expect(addMonths('2026-01-01', -1)).toBe('2025-12-01');
  });
});

describe('formatBillingMonth()', () => {
  it('formats YYYY-MM-01 as readable Month YYYY', () => {
    expect(formatBillingMonth('2026-05-01')).toBe('May 2026');
    expect(formatBillingMonth('2026-12-01')).toBe('December 2026');
  });
});

describe('isValidBillingMonth()', () => {
  it('accepts a valid YYYY-MM-01 string', () => {
    expect(isValidBillingMonth('2026-05-01')).toBe(true);
  });

  it('rejects non-first-of-month dates', () => {
    expect(isValidBillingMonth('2026-05-15')).toBe(false);
  });

  it('rejects malformed strings', () => {
    expect(isValidBillingMonth('2026-5-01')).toBe(false);
    expect(isValidBillingMonth('2026-13-01')).toBe(false);
    expect(isValidBillingMonth('not-a-date')).toBe(false);
  });
});
