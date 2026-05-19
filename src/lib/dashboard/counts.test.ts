import { describe, it, expect } from 'vitest';
import { countByStatus, sumByStatus, pickRoleHome } from './counts';

describe('countByStatus()', () => {
  const statuses = ['New', 'In Progress', 'Needs changes'] as const;

  it('aggregates duplicates and returns zero for unseen statuses', () => {
    const rows = [
      { status: 'New' as const },
      { status: 'New' as const },
      { status: 'In Progress' as const },
    ];
    expect(countByStatus(rows, statuses)).toEqual({
      'New': 2,
      'In Progress': 1,
      'Needs changes': 0,
    });
  });

  it('returns object with all zeros for null input', () => {
    expect(countByStatus(null, statuses)).toEqual({
      'New': 0,
      'In Progress': 0,
      'Needs changes': 0,
    });
  });

  it('returns object with all zeros for undefined input', () => {
    expect(countByStatus(undefined, statuses)).toEqual({
      'New': 0,
      'In Progress': 0,
      'Needs changes': 0,
    });
  });

  it('ignores rows whose status is not in the requested set', () => {
    const rows = [
      { status: 'New' as const },
      { status: 'Other' as never },
    ];
    expect(countByStatus(rows, statuses)).toEqual({
      'New': 1,
      'In Progress': 0,
      'Needs changes': 0,
    });
  });
});

describe('sumByStatus()', () => {
  const statuses = ['ACCRUED', 'PAYABLE', 'PAID', 'REVERSED'] as const;

  it('sums amount_cents per status and zero for unseen statuses', () => {
    const rows = [
      { status: 'ACCRUED' as const, amount_cents: 1000 },
      { status: 'ACCRUED' as const, amount_cents: 500 },
      { status: 'PAID' as const, amount_cents: 2500 },
    ];
    expect(sumByStatus(rows, statuses)).toEqual({
      ACCRUED: 1500,
      PAYABLE: 0,
      PAID: 2500,
      REVERSED: 0,
    });
  });

  it('returns object with all zeros for null input', () => {
    expect(sumByStatus(null, statuses)).toEqual({
      ACCRUED: 0,
      PAYABLE: 0,
      PAID: 0,
      REVERSED: 0,
    });
  });

  it('returns object with all zeros for undefined input', () => {
    expect(sumByStatus(undefined, statuses)).toEqual({
      ACCRUED: 0,
      PAYABLE: 0,
      PAID: 0,
      REVERSED: 0,
    });
  });
});

describe('pickRoleHome()', () => {
  it('maps each role to the correct home key', () => {
    expect(pickRoleHome('Client')).toBe('client');
    expect(pickRoleHome('Sourcer')).toBe('sourcer');
    expect(pickRoleHome('Copywriter')).toBe('copywriter');
    expect(pickRoleHome('Manager')).toBe('manager');
    expect(pickRoleHome('Admin')).toBe('admin');
  });

  it('returns null for null, undefined, and unknown roles', () => {
    expect(pickRoleHome(null)).toBeNull();
    expect(pickRoleHome(undefined)).toBeNull();
    // @ts-expect-error — testing runtime guard against unexpected string
    expect(pickRoleHome('Other')).toBeNull();
  });
});
