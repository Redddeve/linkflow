'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
} from 'lucide-react'
import { createClient } from '@/lib/client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UserRow, UserRole } from '@/lib/auth'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  Client: [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="nav-icon" /> },
    { href: '/dashboard/catalog', label: 'Catalog', icon: <Globe className="nav-icon" /> },
    { href: '/dashboard/cart', label: 'Cart', icon: <ShoppingCart className="nav-icon" /> },
    { href: '/dashboard/orders', label: 'Orders', icon: <FileText className="nav-icon" /> },
    { href: '/dashboard/invoices', label: 'Invoices', icon: <Receipt className="nav-icon" /> },
  ],
  Manager: [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="nav-icon" /> },
    { href: '/dashboard/orders', label: 'Orders', icon: <FileText className="nav-icon" /> },
    { href: '/dashboard/sites', label: 'Sites', icon: <Globe className="nav-icon" /> },
    { href: '/dashboard/invoices', label: 'Invoices', icon: <Receipt className="nav-icon" /> },
  ],
  Copywriter: [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="nav-icon" /> },
    { href: '/dashboard/orders', label: 'My Orders', icon: <FileText className="nav-icon" /> },
  ],
  Sourcer: [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="nav-icon" /> },
    { href: '/dashboard/sites', label: 'My Sites', icon: <Globe className="nav-icon" /> },
    { href: '/dashboard/commissions', label: 'Commissions', icon: <BadgeDollarSign className="nav-icon" /> },
  ],
  Admin: [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="nav-icon" /> },
    { href: '/dashboard/users', label: 'Users', icon: <Users className="nav-icon" /> },
    { href: '/dashboard/sites', label: 'Sites', icon: <Globe className="nav-icon" /> },
    { href: '/dashboard/orders', label: 'Orders', icon: <FileText className="nav-icon" /> },
    { href: '/dashboard/invoices', label: 'Invoices', icon: <Receipt className="nav-icon" /> },
    { href: '/dashboard/commissions', label: 'Commissions', icon: <BadgeDollarSign className="nav-icon" /> },
  ],
}

function userInitials(user: UserRow): string {
  const f = user.first_name.trim()
  const l = user.last_name.trim()
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase()
  if (f) return f[0].toUpperCase()
  return (user.email[0] ?? '?').toUpperCase()
}

function displayName(user: UserRow): string {
  const f = user.first_name.trim()
  const l = user.last_name.trim()
  if (f || l) return `${f} ${l}`.trim()
  return user.email
}

export function DashboardShell({
  user,
  children,
}: {
  user: UserRow
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const navItems = NAV_ITEMS[user.role] ?? []

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <TooltipProvider>
      <div className="app">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">L</div>
            <span>LinkFlow</span>
          </div>

          <div className="role-pill">
            <div className="avatar">{userInitials(user)}</div>
            <div className="meta">
              <div className="name">{displayName(user)}</div>
              <div className="role">{user.role}</div>
            </div>
          </div>

          <div className="nav-label">Workspace</div>

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

          <div style={{ flex: 1 }} />
          <Separator className="my-2" />

          <Tooltip>
            <TooltipTrigger
              className="nav-item w-full text-left"
              onClick={handleSignOut}
            >
              <LogOut className="nav-icon" />
              <span>Sign out</span>
            </TooltipTrigger>
            <TooltipContent side="right">Sign out of LinkFlow</TooltipContent>
          </Tooltip>
        </aside>

        {/* Main area */}
        <div className="main">
          {/* Topbar */}
          <div className="topbar">
            <div className="flex-1" />

            <Tooltip>
              <TooltipTrigger
                className="relative flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex h-8 w-8 items-center justify-center rounded-full outline-none"
                aria-label="User menu"
              >
                <Avatar className="h-7 w-7 text-xs">
                  <AvatarFallback
                    className="font-semibold text-[11px]"
                    style={{
                      background: 'var(--accent-soft)',
                      color: 'var(--accent-text)',
                    }}
                  >
                    {userInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5 text-sm font-medium">{displayName(user)}</div>
                <div className="px-2 pb-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {user.email}
                </div>
                <div className="px-2 pb-2 text-xs" style={{ color: 'var(--text-faint)' }}>
                  {user.role}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {children}
        </div>
      </div>
    </TooltipProvider>
  )
}
