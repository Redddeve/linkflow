import { describe, it, expect } from 'vitest';
import {
  can,
  PERMISSIONS,
  canManageTargetRole,
  canReassignClientManager,
} from '.';
import type { UserRole } from '@/lib/features/auth';

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
    const roles: UserRole[] = [
      'Client',
      'Sourcer',
      'Copywriter',
      'Manager',
      'Admin',
    ];
    for (const perm of Object.keys(
      PERMISSIONS,
    ) as (keyof typeof PERMISSIONS)[]) {
      for (const role of roles) {
        expect(() => can(role, perm)).not.toThrow();
      }
    }
  });

  it('grants users:view to Admin and Manager only', () => {
    expect(can('Admin', 'users:view')).toBe(true);
    expect(can('Manager', 'users:view')).toBe(true);
    expect(can('Client', 'users:view')).toBe(false);
    expect(can('Sourcer', 'users:view')).toBe(false);
    expect(can('Copywriter', 'users:view')).toBe(false);
  });
});

describe('canManageTargetRole()', () => {
  it('Admin can manage every role', () => {
    const roles: UserRole[] = [
      'Client',
      'Sourcer',
      'Copywriter',
      'Manager',
      'Admin',
    ];
    for (const r of roles) {
      expect(canManageTargetRole('Admin', r)).toBe(true);
    }
  });

  it('Manager can manage Client, Sourcer, Copywriter only', () => {
    expect(canManageTargetRole('Manager', 'Client')).toBe(true);
    expect(canManageTargetRole('Manager', 'Sourcer')).toBe(true);
    expect(canManageTargetRole('Manager', 'Copywriter')).toBe(true);
    expect(canManageTargetRole('Manager', 'Manager')).toBe(false);
    expect(canManageTargetRole('Manager', 'Admin')).toBe(false);
  });

  it('treats a null target role as not manageable', () => {
    expect(canManageTargetRole('Admin', null)).toBe(false);
    expect(canManageTargetRole('Manager', null)).toBe(false);
  });

  it('non-Admin/Manager actors cannot manage any role', () => {
    const actors: UserRole[] = ['Client', 'Sourcer', 'Copywriter'];
    for (const actor of actors) {
      expect(canManageTargetRole(actor, 'Client')).toBe(false);
      expect(canManageTargetRole(actor, 'Sourcer')).toBe(false);
      expect(canManageTargetRole(actor, 'Copywriter')).toBe(false);
    }
  });
});

describe('canReassignClientManager()', () => {
  it('Admin can reassign any Client', () => {
    expect(
      canReassignClientManager({
        actorRole: 'Admin',
        actorId: 'admin-1',
        targetRole: 'Client',
        targetManagerId: 'mgr-2',
      }),
    ).toBe(true);
    expect(
      canReassignClientManager({
        actorRole: 'Admin',
        actorId: 'admin-1',
        targetRole: 'Client',
        targetManagerId: null,
      }),
    ).toBe(true);
  });

  it('Manager can reassign only Clients they currently manage', () => {
    expect(
      canReassignClientManager({
        actorRole: 'Manager',
        actorId: 'mgr-1',
        targetRole: 'Client',
        targetManagerId: 'mgr-1',
      }),
    ).toBe(true);
    expect(
      canReassignClientManager({
        actorRole: 'Manager',
        actorId: 'mgr-1',
        targetRole: 'Client',
        targetManagerId: 'mgr-2',
      }),
    ).toBe(false);
    expect(
      canReassignClientManager({
        actorRole: 'Manager',
        actorId: 'mgr-1',
        targetRole: 'Client',
        targetManagerId: null,
      }),
    ).toBe(false);
  });

  it('returns false when target is not a Client', () => {
    const roles: (UserRole | null)[] = [
      'Sourcer',
      'Copywriter',
      'Manager',
      'Admin',
      null,
    ];
    for (const r of roles) {
      expect(
        canReassignClientManager({
          actorRole: 'Admin',
          actorId: 'admin-1',
          targetRole: r,
          targetManagerId: null,
        }),
      ).toBe(false);
    }
  });

  it('non-Admin/Manager actors cannot reassign', () => {
    const actors: UserRole[] = ['Client', 'Sourcer', 'Copywriter'];
    for (const actor of actors) {
      expect(
        canReassignClientManager({
          actorRole: actor,
          actorId: 'x',
          targetRole: 'Client',
          targetManagerId: 'x',
        }),
      ).toBe(false);
    }
  });
});
