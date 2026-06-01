'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  updateOwnPassword,
  sendOwnPasswordReset,
} from '@/app/dashboard/profile/actions';

type FormValues = {
  current_password: string;
  password: string;
  confirm: string;
};

export function ChangeCredentialsDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [resetState, setResetState] = useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle');
  const [resetError, setResetError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setError,
    formState: { errors },
  } = useForm<FormValues>();

  function submit(data: FormValues) {
    startTransition(async () => {
      const result = await updateOwnPassword(data.current_password, data.password);
      if (result.success) {
        setSuccess(true);
        reset();
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 1200);
        return;
      }
      if (/current password/i.test(result.message)) {
        setError('current_password', { message: result.message });
      } else {
        setError('root', { message: result.message });
      }
    });
  }

  async function handleForgotPassword() {
    setResetState('sending');
    setResetError(null);
    const result = await sendOwnPasswordReset();
    if (result.success) {
      setResetState('sent');
    } else {
      setResetState('error');
      setResetError(result.message);
    }
  }

  function handleDialogChange(o: boolean) {
    if (!o) {
      reset();
      setSuccess(false);
      setResetState('idle');
      setResetError(null);
    }
    setOpen(o);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        Change Credentials
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Credentials</DialogTitle>
        </DialogHeader>
        <form
          id="change-credentials-form"
          onSubmit={handleSubmit(submit)}
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="current_password">Current password</Label>
            <Input
              id="current_password"
              type="password"
              autoComplete="current-password"
              {...register('current_password', {
                required: 'Current password is required',
              })}
            />
            {errors.current_password && (
              <p className="text-sm text-destructive">
                {errors.current_password.message}
              </p>
            )}
            <div className="text-xs">
              {resetState === 'sent' ? (
                <span className="text-(--st-live-fg)">
                  Reset email sent. Check your inbox.
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetState === 'sending'}
                  className="text-primary hover:underline disabled:opacity-50"
                >
                  {resetState === 'sending'
                    ? 'Sending reset email…'
                    : 'Forgot password?'}
                </button>
              )}
              {resetState === 'error' && resetError && (
                <p className="mt-1 text-destructive">{resetError}</p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
              })}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              {...register('confirm', {
                required: 'Confirm your password',
                validate: (v) =>
                  v === getValues('password') || 'Passwords do not match',
              })}
            />
            {errors.confirm && (
              <p className="text-sm text-destructive">
                {errors.confirm.message}
              </p>
            )}
          </div>

          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}
          {success && (
            <p className="text-sm text-(--st-live-fg)">Password updated.</p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="change-credentials-form"
            disabled={isPending || success}
          >
            {isPending ? 'Saving…' : 'Save password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
