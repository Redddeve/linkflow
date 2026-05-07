import { describe, it, expect } from 'vitest';
import { can, PERMISSIONS } from './rbac';
import type { UserRole } from './auth';

describe('can()', () => {
  it('returns true when role has the permission', () => {
    expect(can('Admin', 'users:manage')).toBe(true);
    expect(can('Admin', 'sites:change_status')).toBe(true);
    expect(can('Client', 'cart:manage')).toBe(true);
    expect(can('Sourcer', 'sites:create')).toBe(true);
    expect(can('Copywriter', 'orders:edit_content')).toBe(true);
    expect(can('Manager', 'orders:view_all')).toBe(true);
  });

  it('returns false when role lacks the permission', () => {
    expect(can('Client', 'users:manage')).toBe(false);
    expect(can('Sourcer', 'users:manage')).toBe(false);
    expect(can('Copywriter', 'users:manage')).toBe(false);
    expect(can('Manager', 'users:manage')).toBe(false);
    expect(can('Client', 'sites:change_status')).toBe(false);
    expect(can('Copywriter', 'cart:manage')).toBe(false);
  });

  it('covers every permission key without throwing', () => {
    const roles: UserRole[] = ['Client', 'Sourcer', 'Copywriter', 'Manager', 'Admin'];
    for (const perm of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) {
      for (const role of roles) {
        expect(() => can(role, perm)).not.toThrow();
      }
    }
  });
});
