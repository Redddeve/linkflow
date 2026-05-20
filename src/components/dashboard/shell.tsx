'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Globe,
  ShoppingCart,
  FileText,
  Receipt,
  BadgeDollarSign,
  Bell,
  LogOut,
  Tag,
  MessageSquare,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { UserRow, UserRole } from '@/lib/auth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  Client: [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="nav-icon" />,
    },
    {
      href: '/dashboard/catalog',
      label: 'Catalog',
      icon: <Globe className="nav-icon" />,
    },
    {
      href: '/dashboard/cart',
      label: 'Cart',
      icon: <ShoppingCart className="nav-icon" />,
    },
    {
      href: '/dashboard/orders',
      label: 'Orders',
      icon: <FileText className="nav-icon" />,
    },
    {
      href: '/dashboard/invoices',
      label: 'Invoices',
      icon: <Receipt className="nav-icon" />,
    },
    {
      href: '/dashboard/chat',
      label: 'Chat',
      icon: <MessageSquare className="nav-icon" />,
    },
  ],
  Manager: [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="nav-icon" />,
    },
    {
      href: '/dashboard/orders',
      label: 'Orders',
      icon: <FileText className="nav-icon" />,
    },
    {
      href: '/dashboard/sites',
      label: 'Sites',
      icon: <Globe className="nav-icon" />,
    },
    {
      href: '/dashboard/invoices',
      label: 'Invoices',
      icon: <Receipt className="nav-icon" />,
    },
    {
      href: '/dashboard/commissions',
      label: 'Commissions',
      icon: <BadgeDollarSign className="nav-icon" />,
    },
    {
      href: '/dashboard/chat',
      label: 'Chat',
      icon: <MessageSquare className="nav-icon" />,
    },
  ],
  Copywriter: [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="nav-icon" />,
    },
    {
      href: '/dashboard/orders',
      label: 'My Orders',
      icon: <FileText className="nav-icon" />,
    },
    {
      href: '/dashboard/chat',
      label: 'Chat',
      icon: <MessageSquare className="nav-icon" />,
    },
  ],
  Sourcer: [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="nav-icon" />,
    },
    {
      href: '/dashboard/sites',
      label: 'My Sites',
      icon: <Globe className="nav-icon" />,
    },
    {
      href: '/dashboard/commissions',
      label: 'Commissions',
      icon: <BadgeDollarSign className="nav-icon" />,
    },
    {
      href: '/dashboard/chat',
      label: 'Chat',
      icon: <MessageSquare className="nav-icon" />,
    },
  ],
  Admin: [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="nav-icon" />,
    },
    {
      href: '/dashboard/users',
      label: 'Users',
      icon: <Users className="nav-icon" />,
    },
    {
      href: '/dashboard/sites',
      label: 'Sites',
      icon: <Globe className="nav-icon" />,
    },
    {
      href: '/dashboard/categories',
      label: 'Categories',
      icon: <Tag className="nav-icon" />,
    },
    {
      href: '/dashboard/orders',
      label: 'Orders',
      icon: <FileText className="nav-icon" />,
    },
    {
      href: '/dashboard/invoices',
      label: 'Invoices',
      icon: <Receipt className="nav-icon" />,
    },
    {
      href: '/dashboard/commissions',
      label: 'Commissions',
      icon: <BadgeDollarSign className="nav-icon" />,
    },
    {
      href: '/dashboard/chat',
      label: 'Chat',
      icon: <MessageSquare className="nav-icon" />,
    },
  ],
};

function userInitials(user: UserRow): string {
  const f = user.first_name.trim();
  const l = user.last_name.trim();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f) return f[0].toUpperCase();
  return (user.email[0] ?? '?').toUpperCase();
}

function displayName(user: UserRow): string {
  const f = user.first_name.trim();
  const l = user.last_name.trim();
  if (f || l) return `${f} ${l}`.trim();
  return user.email;
}

export function DashboardShell({
  user,
  children,
}: {
  user: UserRow;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = (user.role ? NAV_ITEMS[user.role] : null) ?? [];

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <TooltipProvider>
      <div className="app">
        {/* Sidebar */}
        <aside className="sidebar">
          {/* Brand */}
          <div className="brand">
            <div className="brand-mark">L</div>
            <span>LinkFlow</span>
          </div>

          {/* Nav */}
          <div className="nav-label">Workspace</div>
          <nav className="flex flex-col gap-0.5 flex-1 pb-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Bottom: user info + sign out */}
          <div className="sidebar-footer">
            <div className="user-row">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-[11px] font-semibold">
                  {userInitials(user)}
                </AvatarFallback>
              </Avatar>
              <div className="user-meta min-w-0">
                <div className="user-name">{displayName(user)}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="nav-item w-full mt-0.5 text-left"
            >
              <LogOut className="nav-icon" />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* Main area */}
        <div className="main">
          {/* Topbar */}
          <div className="topbar">
            <div className="flex-1" />

            <Tooltip>
              <TooltipTrigger
                className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex h-8 w-8 items-center justify-center rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="User menu"
              >
                <Avatar className="h-7 w-7 ring-2 ring-primary-soft">
                  <AvatarFallback className="bg-primary-soft text-[11px] font-semibold text-primary-text">
                    {userInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-2">
                  <div className="truncate text-sm font-medium">{displayName(user)}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {user.email}
                  </div>
                  <div className="mt-1 inline-flex items-center rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary-text">
                    {user.role}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <main className="px-6 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
