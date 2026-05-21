import type { UserRole } from '@/lib/auth'

export const PERMISSIONS = {
  // Site capabilities
  'sites:browse_active_catalog': ['Client'] as UserRole[],
  'sites:view_all_statuses':     ['Manager', 'Admin'] as UserRole[],
  'sites:view_own':              ['Sourcer'] as UserRole[],
  'sites:create':                ['Sourcer'] as UserRole[],
  'sites:edit_own':              ['Sourcer'] as UserRole[],
  'sites:edit_any':              ['Manager', 'Admin'] as UserRole[],
  'sites:change_status':         ['Admin'] as UserRole[],

  // Category capabilities
  'categories:manage':           ['Admin'] as UserRole[],

  // Cart capabilities
  'cart:manage':                 ['Client'] as UserRole[],

  // Order capabilities
  'orders:create_from_cart':     ['Client'] as UserRole[],
  'orders:view_own':             ['Client', 'Sourcer'] as UserRole[],
  'orders:view_assigned':        ['Copywriter'] as UserRole[],
  'orders:view_all':             ['Manager', 'Admin'] as UserRole[],
  'orders:edit_new':             ['Client', 'Manager', 'Admin'] as UserRole[],
  'orders:cancel_new':           ['Client', 'Manager', 'Admin'] as UserRole[],
  'orders:assign_copywriter':    ['Manager', 'Admin'] as UserRole[],
  'orders:edit_content':         ['Copywriter'] as UserRole[],
  'orders:submit_content':       ['Copywriter'] as UserRole[],
  'orders:review_content':       ['Client', 'Manager', 'Admin'] as UserRole[],
  'orders:publish':              ['Manager', 'Admin'] as UserRole[],

  // User management
  'users:manage':                ['Admin'] as UserRole[],

  // Invoice capabilities
  'invoices:view_own':           ['Client'] as UserRole[],
  'invoices:view_all':           ['Manager', 'Admin'] as UserRole[],
  'invoices:mark_paid':          ['Admin'] as UserRole[],

  // Audit log
  'audit_log:view_all':          ['Admin'] as UserRole[],
  'audit_log:view_assigned':     ['Manager'] as UserRole[],

  // Earnings (sourcer payouts) capabilities
  'earnings:view_own':           ['Sourcer'] as UserRole[],
  'earnings:view_all':           ['Admin'] as UserRole[],
  'earnings:mark_paid':          ['Admin'] as UserRole[],

  // Chat capabilities
  'chat:view':                   ['Client', 'Sourcer', 'Copywriter', 'Manager', 'Admin'] as UserRole[],
  'chat:create':                 ['Client', 'Sourcer', 'Copywriter', 'Manager', 'Admin'] as UserRole[],
  'chat:send_message':           ['Client', 'Sourcer', 'Copywriter', 'Manager', 'Admin'] as UserRole[],
} as const

export type Permission = keyof typeof PERMISSIONS

export function can(role: UserRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role)
}
