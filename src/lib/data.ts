export const SEED_SITES = [
  { id: 'S-001', domain: 'site-alpha.com',   dr: 62, traffic: '48K', price: 320, category: 'Tech',      status: 'approved', sourcer: 'Sourcer A' },
  { id: 'S-002', domain: 'site-beta.com',    dr: 54, traffic: '22K', price: 240, category: 'Finance',   status: 'approved', sourcer: 'Sourcer B' },
  { id: 'S-003', domain: 'site-gamma.com',   dr: 71, traffic: '92K', price: 480, category: 'Health',    status: 'approved', sourcer: 'Sourcer A' },
  { id: 'S-004', domain: 'site-delta.com',   dr: 38, traffic: '8K',  price: 140, category: 'Lifestyle', status: 'pending',  sourcer: 'Sourcer C' },
  { id: 'S-005', domain: 'site-epsilon.com', dr: 45, traffic: '14K', price: 180, category: 'Travel',    status: 'pending',  sourcer: 'Sourcer B' },
  { id: 'S-006', domain: 'site-zeta.com',    dr: 58, traffic: '31K', price: 280, category: 'Tech',      status: 'pending',  sourcer: 'Sourcer A' },
  { id: 'S-007', domain: 'site-eta.com',     dr: 29, traffic: '4K',  price:  90, category: 'Lifestyle', status: 'rejected', sourcer: 'Sourcer C' },
  { id: 'S-008', domain: 'site-theta.com',   dr: 66, traffic: '58K', price: 380, category: 'Finance',   status: 'approved', sourcer: 'Sourcer A' },
  { id: 'S-009', domain: 'site-iota.com',    dr: 50, traffic: '18K', price: 220, category: 'Health',    status: 'approved', sourcer: 'Sourcer B' },
  { id: 'S-010', domain: 'site-kappa.com',   dr: 43, traffic: '11K', price: 160, category: 'Travel',    status: 'pending',  sourcer: 'Sourcer C' },
] as const;

export const SEED_ORDERS = [
  { id: 'ORD-1042', client: 'Client A', target: '/landing-page-1', anchor: 'best widgets', sites: ['S-001', 'S-003'], stage: 'content',  copywriter: 'Writer A', manager: 'Manager A', created: 'Apr 28', due: 'May 12', amount: 800, invoiceStatus: 'pending' },
  { id: 'ORD-1041', client: 'Client A', target: '/landing-page-2', anchor: 'top tools',    sites: ['S-002'],          stage: 'approval', copywriter: 'Writer B', manager: 'Manager A', created: 'Apr 25', due: 'May 09', amount: 240, invoiceStatus: 'pending' },
  { id: 'ORD-1040', client: 'Client B', target: '/blog-post-1',    anchor: 'guide to X',   sites: ['S-008', 'S-009'], stage: 'publish',  copywriter: 'Writer A', manager: 'Manager A', created: 'Apr 22', due: 'May 06', amount: 600, invoiceStatus: 'pending' },
  { id: 'ORD-1039', client: 'Client C', target: '/product-1',      anchor: 'buy product',  sites: ['S-001'],          stage: 'done',     copywriter: 'Writer B', manager: 'Manager A', created: 'Apr 18', due: 'May 02', amount: 320, invoiceStatus: 'paid'    },
  { id: 'ORD-1038', client: 'Client A', target: '/landing-page-3', anchor: 'review',       sites: ['S-003'],          stage: 'assign',   copywriter: null,        manager: 'Manager A', created: 'May 01', due: 'May 15', amount: 480, invoiceStatus: 'draft'   },
  { id: 'ORD-1037', client: 'Client B', target: '/blog-post-2',    anchor: 'compare',      sites: ['S-002', 'S-009'], stage: 'order',    copywriter: null,        manager: 'Manager A', created: 'May 02', due: 'May 16', amount: 460, invoiceStatus: 'draft'   },
  { id: 'ORD-1036', client: 'Client D', target: '/landing-page-4', anchor: 'learn more',   sites: ['S-008'],          stage: 'content',  copywriter: 'Writer C', manager: 'Manager A', created: 'Apr 30', due: 'May 14', amount: 380, invoiceStatus: 'draft'   },
  { id: 'ORD-1035', client: 'Client C', target: '/blog-post-3',    anchor: 'overview',     sites: ['S-001', 'S-008'], stage: 'done',     copywriter: 'Writer A', manager: 'Manager A', created: 'Apr 14', due: 'Apr 28', amount: 700, invoiceStatus: 'overdue' },
];

export const STAGES = [
  { id: 'order',    label: 'New order',     short: 'New'     },
  { id: 'assign',   label: 'Assigning',     short: 'Assign'  },
  { id: 'content',  label: 'Writing',       short: 'Writing' },
  { id: 'approval', label: 'Client review', short: 'Review'  },
  { id: 'publish',  label: 'Publishing',    short: 'Publish' },
  { id: 'done',     label: 'Live',          short: 'Live'    },
];

export const ROLES = [
  { id: 'client',     label: 'Client',     name: 'Client A',   initial: 'C' },
  { id: 'manager',    label: 'Manager',    name: 'Manager A',  initial: 'M' },
  { id: 'copywriter', label: 'Copywriter', name: 'Writer A',   initial: 'W' },
  { id: 'sourcer',    label: 'Sourcer',    name: 'Sourcer A',  initial: 'S' },
  { id: 'admin',      label: 'Admin',      name: 'Admin A',    initial: 'A' },
];

export const SEED_TASKS = [
  { id: 'T-201', orderId: 'ORD-1042', site: 'S-001', type: 'Write article',  brief: 'Anchor: "best widgets" → /landing-page-1. 800w, informational tone.', status: 'in-progress', due: 'May 06' },
  { id: 'T-202', orderId: 'ORD-1042', site: 'S-003', type: 'Write article',  brief: 'Anchor: "best widgets" → /landing-page-1. 1000w, listicle.',          status: 'todo',        due: 'May 08' },
  { id: 'T-203', orderId: 'ORD-1041', site: 'S-002', type: 'Revise article', brief: 'Client requested two edits in section 2. See comments.',               status: 'review',      due: 'May 04' },
  { id: 'T-204', orderId: 'ORD-1036', site: 'S-008', type: 'Write article',  brief: 'Anchor: "learn more" → /landing-page-4. 600w.',                        status: 'todo',        due: 'May 10' },
];

export const SEED_INVOICES = [
  { id: 'INV-3014', order: 'ORD-1039', client: 'Client C', amount: 320, status: 'paid',    issued: 'Apr 19', due: 'May 03' },
  { id: 'INV-3013', order: 'ORD-1035', client: 'Client C', amount: 700, status: 'overdue', issued: 'Apr 14', due: 'Apr 28' },
  { id: 'INV-3012', order: 'ORD-1041', client: 'Client A', amount: 240, status: 'pending', issued: 'Apr 26', due: 'May 10' },
  { id: 'INV-3011', order: 'ORD-1042', client: 'Client A', amount: 800, status: 'pending', issued: 'Apr 28', due: 'May 12' },
  { id: 'INV-3010', order: 'ORD-1040', client: 'Client B', amount: 600, status: 'pending', issued: 'Apr 22', due: 'May 06' },
];

export const SEED_USERS = [
  { name: 'Client A',   role: 'Client',     orders: 4, since: 'Jan 2026' },
  { name: 'Client B',   role: 'Client',     orders: 2, since: 'Feb 2026' },
  { name: 'Client C',   role: 'Client',     orders: 2, since: 'Mar 2026' },
  { name: 'Client D',   role: 'Client',     orders: 1, since: 'Apr 2026' },
  { name: 'Manager A',  role: 'Manager',    orders: 8, since: 'Nov 2025' },
  { name: 'Writer A',   role: 'Copywriter', orders: 3, since: 'Dec 2025' },
  { name: 'Writer B',   role: 'Copywriter', orders: 2, since: 'Jan 2026' },
  { name: 'Writer C',   role: 'Copywriter', orders: 1, since: 'Mar 2026' },
  { name: 'Sourcer A',  role: 'Sourcer',    orders: 4, since: 'Dec 2025' },
  { name: 'Sourcer B',  role: 'Sourcer',    orders: 3, since: 'Jan 2026' },
  { name: 'Sourcer C',  role: 'Sourcer',    orders: 3, since: 'Feb 2026' },
];

export const NAV: Record<string, Array<{ id: string; label: string; icon: string; count?: number }>> = {
  client: [
    { id: 'home',     label: 'Dashboard',    icon: 'home' },
    { id: 'orders',   label: 'My orders',    icon: 'orders', count: 4 },
    { id: 'new',      label: 'New order',    icon: 'plus' },
    { id: 'catalog',  label: 'Site catalog', icon: 'sites' },
    { id: 'approve',  label: 'To approve',   icon: 'check', count: 1 },
    { id: 'invoices', label: 'Invoices',     icon: 'invoice', count: 3 },
  ],
  manager: [
    { id: 'home',     label: 'Dashboard',  icon: 'home' },
    { id: 'pipeline', label: 'Pipeline',   icon: 'pipe' },
    { id: 'orders',   label: 'All orders', icon: 'orders', count: 8 },
    { id: 'team',     label: 'Team',       icon: 'team' },
    { id: 'sites',    label: 'Sites',      icon: 'sites' },
    { id: 'invoices', label: 'Invoices',   icon: 'invoice' },
  ],
  copywriter: [
    { id: 'home',    label: 'My tasks', icon: 'inbox', count: 3 },
    { id: 'editor',  label: 'Editor',   icon: 'write' },
    { id: 'archive', label: 'Archive',  icon: 'book' },
  ],
  sourcer: [
    { id: 'home',     label: 'My sites',    icon: 'sites' },
    { id: 'submit',   label: 'Submit site', icon: 'plus' },
    { id: 'earnings', label: 'Commissions', icon: 'money' },
  ],
  admin: [
    { id: 'home',      label: 'Overview',      icon: 'chart' },
    { id: 'approvals', label: 'Site approvals', icon: 'check', count: 4 },
    { id: 'users',     label: 'Users',          icon: 'team' },
    { id: 'finance',   label: 'Finance',        icon: 'cash' },
    { id: 'settings',  label: 'Settings',       icon: 'settings' },
  ],
};
