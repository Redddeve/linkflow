import {
  LayoutDashboard,
  Users,
  Globe,
  ShoppingCart,
  FileText,
  Receipt,
  Tag,
  MessageSquare,
  Wallet,
} from 'lucide-react';
import type { UserRole } from '@/lib/features/auth';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export const NAV_ITEMS: Record<UserRole, NavItem[]> = {
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
      href: '/dashboard/users',
      label: 'Users',
      icon: <Users className="nav-icon" />,
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
      href: '/dashboard/earnings',
      label: 'Earnings',
      icon: <Wallet className="nav-icon" />,
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
      href: '/dashboard/earnings',
      label: 'Earnings',
      icon: <Wallet className="nav-icon" />,
    },
    {
      href: '/dashboard/chat',
      label: 'Chat',
      icon: <MessageSquare className="nav-icon" />,
    },
  ],
};
