'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SiteForm } from '../new/site-form';
import type { Database } from '@/types/database.types';

type UserRole = Database['public']['Enums']['user_role'];

interface Props {
  siteId: string;
  actorRole: UserRole;
  categories: { id: string; name: string }[];
  defaultValues: React.ComponentProps<typeof SiteForm>['defaultValues'];
}

export function EditSiteDialog({ siteId, actorRole, categories, defaultValues }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit site</DialogTitle>
        </DialogHeader>
        <SiteForm
          mode="edit"
          siteId={siteId}
          categories={categories}
          actorRole={actorRole}
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
          defaultValues={defaultValues}
        />
      </DialogContent>
    </Dialog>
  );
}
