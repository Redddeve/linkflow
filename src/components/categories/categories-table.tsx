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
import {
  editCategory,
  deleteCategory,
} from '@/app/dashboard/categories/actions';
import { TableEmptyState } from '@/components/ui/table-empty-state';

interface Category {
  id: string;
  name: string;
}

interface Props {
  categories: Category[];
  siteCountMap: Record<string, number>;
}

export function CategoriesTable({ categories, siteCountMap }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

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
      const result = await editCategory(editTarget.id, { name: editName });
      if (!result.success) {
        setEditError(result.message);
        return;
      }
      closeEdit();
      router.refresh();
    });
  }

  async function handleArchive() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteCategory(deleteTarget.id);
      if (!result.success) {
        console.error(result);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow theadrow={true}>
            <TableHead>Name</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
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
                    <DropdownMenuItem onClick={() => openEdit(cat)}>
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteTarget(cat)}
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
      {categories.length === 0 && (
        <TableEmptyState
          title="No categories yet."
          description="Add a category to organize sites in the catalog. Categories help clients filter by topic."
        />
      )}

      <Dialog
        open={!!editTarget}
        onOpenChange={(o) => {
          if (!o) closeEdit();
        }}
      >
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
            {editError && (
              <p className="text-sm text-destructive">{editError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>
              Cancel
            </Button>
            <Button
              disabled={isPending || editName.trim().length === 0}
              onClick={handleEdit}
            >
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete &ldquo;{deleteTarget?.name}&rdquo;?
            </DialogTitle>
          </DialogHeader>
          {deleteTarget && (siteCountMap[deleteTarget.id] ?? 0) > 0 ? (
            <p className="text-sm text-destructive">
              Cannot delete: {siteCountMap[deleteTarget.id]} site
              {siteCountMap[deleteTarget.id] === 1 ? '' : 's'} are assigned to
              this category. Reassign them first.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              This category will be permanently deleted.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                isPending ||
                (deleteTarget
                  ? (siteCountMap[deleteTarget.id] ?? 0) > 0
                  : false)
              }
              onClick={handleArchive}
            >
              {isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
