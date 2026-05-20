'use client';

import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
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
import { loginWithPassword } from './actions';

type UserRole = (typeof Constants.public.Enums.user_role)[number];

const ROLE_DEMO_EMAILS: Record<UserRole, string> = {
  Admin: 'dmitry.popko@archysoft.com',
  Manager: 'dmitry.popko+manager1@archysoft.com',
  Copywriter: 'dmitry.popko+copywriter1@archysoft.com',
  Sourcer: 'dmitry.popko+sourcer1@archysoft.com',
  Client: 'dmitry.popko+client1@archysoft.com',
};

const ROLE_DEMO_PASSWORD = 'demo123456';

const ROLE_COLORS: Record<UserRole, string> = {
  Admin: 'var(--primary)',
  Manager: 'var(--st-assign-fg)',
  Copywriter: 'var(--st-write-fg)',
  Sourcer: 'var(--st-pub-fg)',
  Client: 'var(--st-live-fg)',
};

type FormValues = {
  email: string;
  password: string;
};

export default function LoginForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const email = useWatch({ control, name: 'email', defaultValue: '' });

  async function onSubmit(data: FormValues) {
    try {
      await loginWithPassword(data.email, data.password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError('root', {
        message: err instanceof Error ? err.message : 'An error occurred',
      });
    }
  }

  function fillRole(role: UserRole) {
    setValue('email', ROLE_DEMO_EMAILS[role]);
    setValue('password', ROLE_DEMO_PASSWORD);
  }

  return (
    <div
      className="flex min-h-svh w-full items-center justify-center p-6 md:p-10"
      style={{
        background:
          'radial-gradient(1200px 500px at 50% -10%, color-mix(in srgb, var(--primary) 10%, transparent), transparent 60%), var(--bg)',
      }}
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="mb-1 flex items-center gap-3">
                <div className="brand-mark">L</div>
                <CardTitle className="text-xl tracking-tight">
                  LinkFlow
                </CardTitle>
              </div>
              <CardDescription>
                Sign in to your account to continue
              </CardDescription>
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
                  {(
                    Constants.public.Enums.user_role as readonly UserRole[]
                  ).map((role) => {
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
                  })}
                </div>
              </div>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
              >
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    {...register('email', { required: 'Email is required' })}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">
                      {errors.email.message}
                    </p>
                  )}
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
                    {...register('password', {
                      required: 'Password is required',
                    })}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                {errors.root && (
                  <p className="text-sm text-destructive">
                    {errors.root.message}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
