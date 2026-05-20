'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { avatarPublicUrl } from '@/lib/avatar';
import { updateProfile } from '@/app/dashboard/profile/actions';
import type { UserRow } from '@/lib/auth';
import type { UpdateProfileInput } from '@/lib/schemas/profile';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 2 * 1024 * 1024;

interface Props {
  user: UserRow;
}

function initials(first: string, last: string, email: string) {
  const f = first.trim();
  const l = last.trim();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f) return f[0].toUpperCase();
  return (email[0] ?? '?').toUpperCase();
}

export function EditProfileDialog({ user }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [avatarPath, setAvatarPath] = useState<string | null>(user.avatar);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    defaultValues: {
      first_name: user.first_name,
      last_name: user.last_name,
    },
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Use JPEG, PNG, WEBP or GIF');
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError('Image must be under 2 MB');
      return;
    }
    setUploadError(null);
    setUploading(true);

    const supabase = createClient();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { contentType: file.type, upsert: false });

    setUploading(false);
    if (error) {
      setUploadError(error.message);
      return;
    }
    setAvatarPath(path);
  }

  async function submit(data: UpdateProfileInput) {
    startTransition(async () => {
      try {
        await updateProfile({ ...data, avatar: avatarPath });
        setOpen(false);
        router.refresh();
      } catch (e: unknown) {
        setError('root', {
          message: e instanceof Error ? e.message : 'An error occurred',
        });
      }
    });
  }

  function handleDialogChange(o: boolean) {
    if (!o) {
      setAvatarPath(user.avatar);
      setUploadError(null);
    }
    setOpen(o);
  }

  const avatarUrl = avatarPublicUrl(avatarPath);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        Edit Profile
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form
          id="edit-profile-form"
          onSubmit={handleSubmit(submit)}
          className="grid gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar size="lg" className="size-20">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                <AvatarFallback className="text-lg">
                  {initials(user.first_name, user.last_name, user.email)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-label="Upload avatar"
                className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-background hover:bg-primary-hover disabled:opacity-50"
              >
                <Camera className="size-3.5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {uploading
                ? 'Uploading…'
                : 'JPEG, PNG, WEBP or GIF. Max 2 MB.'}
              {uploadError && (
                <p className="mt-1 text-destructive">{uploadError}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                {...register('first_name', { required: 'Required' })}
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">
                  {errors.first_name.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                {...register('last_name', { required: 'Required' })}
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">
                  {errors.last_name.message}
                </p>
              )}
            </div>
          </div>

          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-profile-form"
            disabled={isPending || uploading}
          >
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
