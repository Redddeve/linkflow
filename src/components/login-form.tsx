'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { createClient } from '@/lib/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Constants } from '@/types/database.types';
import Link from 'next/link';

type UserRole = (typeof Constants.public.Enums.user_role)[number];

const ROLE_DEMO_EMAILS: Record<UserRole, string> = {
  Admin: 'dmitry.popko+admin@archysoft.com',
  Manager: 'dmitry.popko+manager@archysoft.com',
  Copywriter: 'dmitry.popko+copywriter@archysoft.com',
  Sourcer: 'dmitry.popko+sourcer@archysoft.com',
  Client: 'dmitry.popko+client@archysoft.com',
};

const ROLE_DEMO_PASSWORD = 'demo123456';

const ROLE_COLORS: Record<UserRole, string> = {
  Admin: 'var(--accent)',
  Manager: 'var(--st-assign-fg)',
  Copywriter: 'var(--st-write-fg)',
  Sourcer: 'var(--st-pub-fg)',
  Client: 'var(--st-live-fg)',
};

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.SubmitEvent) => {
    e.preventDefault();

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fillRole = (role: UserRole) => {
    setEmail(ROLE_DEMO_EMAILS[role]);
    setPassword(ROLE_DEMO_PASSWORD);
    setError(null);
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg font-mono text-sm font-bold text-white"
              style={{ background: 'var(--accent)' }}
            >
              L
            </div>
            <CardTitle className="text-xl">LinkFlow</CardTitle>
          </div>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {/* Role quick-select */}
          <div>
            <p
              className="mb-2 text-xs font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              Sign in as
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(Constants.public.Enums.user_role as readonly UserRole[]).map(
                (role) => {
                  const color = ROLE_COLORS[role];
                  const isActive = email === ROLE_DEMO_EMAILS[role];
                  return (
                    <Button
                      key={role}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fillRole(role)}
                      style={{
                        borderColor: color,
                        color,
                        background: isActive ? color + '18' : undefined,
                      }}
                    >
                      {role}
                    </Button>
                  );
                },
              )}
            </div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/auth/forgot-password"
                  className="ml-auto text-xs underline-offset-4 hover:underline"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
