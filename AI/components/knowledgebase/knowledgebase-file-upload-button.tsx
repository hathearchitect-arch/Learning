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

import { useState } from 'react';
import {
  FileUploader,
  FileUploaderContent,
  FileUploaderItem,
  FileInput,
} from '@/components/file-upload';
import { Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { refreshPage } from '@/lib/api/actions';
import { usePathname } from 'next/navigation';

export function FileUploadButton({
  parentFolderId,
  disabled = false,
}: { parentFolderId?: string; disabled?: boolean }) {
  const [documents, setDocuments] = useState<File[] | null>(null);
  const path = usePathname();

  async function uploadDocument(file: File) {
    const body = {
      name: file.name,
      folderId: null as string | null, // default to null if no parent folder
    };
    if (parentFolderId) {
      body.folderId = parentFolderId;
    }
    // get the presigned URL from the API
    const res = await fetch('/api/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, folderId: parentFolderId }),
    });

    if (!res.ok) {
      return;
    }
    const { data } = await res.json();

    // Upload file to S3 using the pre-signed URL
    return await fetch(data.presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });
  }

  async function handleUploadDocuments() {
    const uploadingDocs = Promise.all(
      documents?.map((file) => uploadDocument(file)) ?? [],
    );

    toast.promise(uploadingDocs, {
      loading: 'Uploading documents...',
      success: `Successfully uploaded ${documents?.length} documents.`,
      error: 'Error uploading documents. Please try again.',
    });
    await uploadingDocs;
    await refreshPage(path);
    setDocuments(null);
  }

  // dropzone configuration
  // max 20 files at a time, 50MB size limit, multiple files uploaded at once enabled
  // only accept what bedrock can accept https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-ds.html
  // 50MB Limit on: .txt, .md, .html, . .docx, .csv, .xlsx, .pdf
  // 3.75MB Limit on: .jpeg, .png (Not currently supported by the config below)
  const dropZoneConfig = {
    maxFiles: 50, // max 20 files at a time
    maxSize: 1024 * 1024 * 50, // 50MB size limit
    multiple: true, // multiple files uploaded at once enabled
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/html': ['.html'],
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
      ],
    },
  };

  const DocumentsSvgDraw = () => {
    return (
      <>
        <svg
          className="w-8 h-8 mb-3 text-gray-500 dark:text-gray-400"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 20 16"
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
          />
        </svg>
        <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-semibold">Click to upload</span>
          &nbsp; or drag and drop
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          PDF, DOCX, XLSX, CSV, TXT, MD, HTML
        </p>
      </>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default" disabled={disabled}>
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md md:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Upload any files that you want to add to this folder.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <FileUploader
            value={documents}
            onValueChange={setDocuments}
            dropzoneOptions={dropZoneConfig}
            className="relative bg-background rounded-lg p-2"
          >
            <FileInput className="outline-dashed outline-1 outline-white">
              <div className="flex items-center justify-center flex-col pt-3 pb-4 w-full ">
                <DocumentsSvgDraw />
              </div>
            </FileInput>
            <FileUploaderContent>
              {documents &&
                documents.length > 0 &&
                documents.map((document, i) => (
                  <FileUploaderItem key={document.name} index={i}>
                    <Paperclip className="h-4 w-4 stroke-current" />
                    <span>{document.name}</span>
                  </FileUploaderItem>
                ))}
            </FileUploaderContent>
          </FileUploader>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button disabled={!documents} onClick={handleUploadDocuments}>
              Upload
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
