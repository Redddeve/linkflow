'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, User as UserIcon, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { avatarPublicUrl } from '@/lib/features/avatar';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NAV_ITEMS } from '@/lib/features/dashboard/nav';
import { useChatReadState } from '@/components/chat/read-state-provider';
import type { UserRow } from '@/lib/features/auth';

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
  notificationsSlot,
  chatUnreadCount = 0,
  cartItemCount = 0,
}: {
  user: UserRow;
  children: React.ReactNode;
  notificationsSlot?: React.ReactNode;
  chatUnreadCount?: number;
  cartItemCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = (user.role ? NAV_ITEMS[user.role] : null) ?? [];
  const avatarUrl = avatarPublicUrl(user.avatar);

  const [navOpen, setNavOpen] = useState(false);
  const [trackedPath, setTrackedPath] = useState(pathname);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  // Close the drawer when the route changes.
  if (trackedPath !== pathname) {
    setTrackedPath(pathname);
    if (navOpen) setNavOpen(false);
  }

  // Close on Escape; lock body scroll while the drawer is open.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNavOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [navOpen]);

  // Prefer the chat layout's per-chat map (when the user is on the chat
  // surface) so opening an unread thread clears the nav dot immediately.
  // Outside the chat surface the provider has no hydrated map and we fall
  // back to the server-side total fetched in the dashboard layout.
  const { unreadChatCount, unreadByChat } = useChatReadState();
  const hasHydratedChatMap = Object.keys(unreadByChat).length > 0;
  const showChatDot = hasHydratedChatMap
    ? unreadChatCount > 0
    : chatUnreadCount > 0;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <TooltipProvider>
      <div className="app">
        {navOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setNavOpen(false)}
            aria-hidden
          />
        )}
        {/* Sidebar */}
        <aside
          id="primary-navigation"
          className="sidebar"
          data-open={navOpen}
          role="dialog"
          aria-modal={navOpen ? 'true' : undefined}
          aria-label="Primary navigation"
        >
          {/* Brand */}
          <Link href="/dashboard" className="brand" aria-label="LinkFlow home">
            <Image
              src="/logo.svg"
              alt=""
              width={28}
              height={28}
              className="brand-mark"
              priority
            />
            <span>LinkFlow</span>
          </Link>

          {/* Nav */}
          <div className="nav-label">Workspace</div>
          <nav className="flex flex-col gap-0.5 flex-1 pb-2">
            {navItems.map((item) => {
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              const showChatUnread =
                item.href === '/dashboard/chat' && showChatDot;
              const showCartCount =
                item.href === '/dashboard/cart' && cartItemCount > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {showCartCount && (
                    <span
                      aria-label={`${cartItemCount} item${cartItemCount === 1 ? '' : 's'} in cart`}
                      className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
                    >
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </span>
                  )}
                  {showChatUnread && (
                    <span
                      aria-label={`${chatUnreadCount} unread message${chatUnreadCount === 1 ? '' : 's'}`}
                      className="ml-auto h-2 w-2 rounded-full bg-primary"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom: user info + sign out */}
          <div className="sidebar-footer">
            <Link
              href="/dashboard/profile"
              className={`user-row ${pathname === '/dashboard/profile' ? 'active' : ''}`}
              aria-label="View profile"
            >
              <Avatar className="h-8 w-8 shrink-0">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="User avatar" />}
                <AvatarFallback className="text-xs font-semibold">
                  {userInitials(user)}
                </AvatarFallback>
              </Avatar>
              <div className="user-meta min-w-0">
                <div className="user-name">{displayName(user)}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </Link>
            <button
              onClick={handleSignOut}
              className="nav-item w-full mt-0.5 cursor-pointer text-left"
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
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setNavOpen((v) => !v)}
              className="-ml-1 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={navOpen}
              aria-controls="primary-navigation"
            >
              {navOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            <div className="flex-1" />

            {notificationsSlot}

            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="User menu"
              >
                <Avatar className="h-7 w-7 ring-2 ring-primary-soft">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                  <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary-text">
                    {userInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-2">
                  <div className="truncate text-sm font-medium">
                    {displayName(user)}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {user.email}
                  </div>
                  <div className="mt-1 inline-flex items-center rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary-text">
                    {user.role}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => router.push('/dashboard/profile')}
                >
                  <UserIcon className="h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <main className="min-h-[calc(100vh-56px)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
