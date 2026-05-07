'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { editCategory, archiveCategory } from './actions';

interface Category {
  id: string;
  name: string;
}

interface Props {
  categories: Category[];
}

export function CategoriesTable({ categories }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');

  const [archiveTarget, setArchiveTarget] = useState<Category | null>(null);

  function openEdit(cat: Category) {
    setEditTarget(cat);
    setEditName(cat.name);
    setEditError('');
  }

  function closeEdit() {
    setEditTarget(null);
    setEditName('');
    setEditError('');
  }

  async function handleEdit() {
    if (!editTarget) return;
    setEditError('');
    startTransition(async () => {
      try {
        await editCategory(editTarget.id, { name: editName });
        closeEdit();
        router.refresh();
      } catch (e: unknown) {
        setEditError(e instanceof Error ? e.message : 'An error occurred');
      }
    });
  }

  async function handleArchive() {
    if (!archiveTarget) return;
    startTransition(async () => {
      try {
        await archiveCategory(archiveTarget.id);
        setArchiveTarget(null);
        router.refresh();
      } catch (e: unknown) {
        console.error(e);
      }
    });
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                No categories yet.
              </TableCell>
            </TableRow>
          )}
          {categories.map((cat) => (
            <TableRow key={cat.id}>
              <TableCell className="font-medium">{cat.name}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
                    aria-label="Category actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(cat)}>Rename</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setArchiveTarget(cat)}
                    >
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) closeEdit(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={100}
            />
            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>Cancel</Button>
            <Button disabled={isPending || editName.trim().length === 0} onClick={handleEdit}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive confirm dialog */}
      <Dialog open={!!archiveTarget} onOpenChange={(o) => { if (!o) setArchiveTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive &ldquo;{archiveTarget?.name}&rdquo;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This category will be hidden from all dropdowns. Sites already assigned to it are unaffected.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={isPending} onClick={handleArchive}>
              {isPending ? 'Archiving…' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
