'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { resetPasswordForEmail } from './actions';

type FormValues = {
  email: string;
};

export default function ForgotPasswordForm() {
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  async function onSubmit(data: FormValues) {
    try {
      console.log(data.email);
      const result = await resetPasswordForEmail(data.email);
      if (!result.success) {
        setError('root', {
          message: result.error,
        });
        console.log('Something went wrong. Please try again.');
        return;
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError('root', {
        message: err instanceof Error ? err.message : 'An error occurred',
      });
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          {success ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Check Your Email</CardTitle>
                <CardDescription>
                  Password reset instructions sent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  If you registered using your email and password, you will
                  receive a password reset email.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Reset Your Password</CardTitle>
                <CardDescription>
                  Type in your email and we&apos;ll send you a link to reset
                  your password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        {...register('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /\S+@\S+\.\S+/,
                            message: 'Enter a valid email',
                          },
                        })}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">
                          {errors.email.message}
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
                      {isSubmitting ? 'Sending...' : 'Send reset email'}
                    </Button>
                  </div>
                  <div className="mt-4 text-center text-sm">
                    <Link
                      href="/login"
                      className="underline underline-offset-4"
                    >
                      Back to login
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
