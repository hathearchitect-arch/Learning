'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { refreshPage } from '@/lib/api/actions';
import { usePathname } from 'next/navigation';

export function FolderCreateButton({
  parentFolderId,
  disabled = false,
}: {
  parentFolderId?: string;
  disabled?: boolean;
}) {
  const path = usePathname();
  async function handleCreateFolder(data: FormData) {
    const res = await fetch('/api/folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.get('name'),
        parentFolderId: parentFolderId,
      }),
    });
    const folder = await res.json();
    if (res.ok) {
      toast.success('Folder created successfully');
    } else {
      toast.error('Error creating folder', {
        description: 'Folder already exists',
      });
    }
    refreshPage(path);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          New Folder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form action={handleCreateFolder}>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>
              Create a folder to organize your files
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input placeholder="name" name="name" />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="submit">Create</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
