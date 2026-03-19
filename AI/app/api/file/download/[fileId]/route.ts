'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { file } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth, getSession, getActiveOrganization } from '@/lib/auth';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Resource } from 'sst';

import * as Sentry from '@sentry/nextjs';
import { Readable } from "stream";

const awsRegion = process.env.AWS_REGION;

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};
const s3Client = new S3Client({
  region: awsRegion,
});

type DownloadFileParams = Promise<{
  fileId: string;
}>;

export async function GET(
  request: NextRequest,
  { params }: { params: DownloadFileParams },
) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'GET /api/file/download/[fileId]',
    },
    async (span) => {
      const session = await getSession();
      const activeOrganization = await getActiveOrganization(request);

      const { fileId } = await params;

      var fileName = "download.pdf";

      span.setAttribute('fileId', fileId);
      span.setAttribute('userId', session?.user?.id || 'anonymous');
      span.setAttribute('organizationId', activeOrganization?.id || 'none');

      if (!session?.user || !activeOrganization) {
        Sentry.captureMessage('Unauthorized download attempt on file endpoint', {
          level: 'warning',
          tags: { fileId, endpoint: 'GET /api/file/download/[fileId]' },
        });

        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized',
            message: 'Session or active organization is invalid',
          },
          { status: 401 },
        );
      }

      //check if user has app-level admin permissions
      const adminPermission = await auth.api.userHasPermission({
        body: {
          userId: session.user.id,
          permission: {
            file: ['retrieve'],
          },
        },
      });

      //check if user has org-level permissions
      const organizationPermission = await auth.api.hasPermission({
        headers: request.headers,
        body: {
          organizationId: activeOrganization.id,
          permissions: {
            file: ['retrieve'],
          },
        },
      });

      if (!adminPermission.success && !organizationPermission.success) {
        Sentry.captureMessage('Insufficient permissions for file download', {
          level: 'warning',
          tags: {
            fileId,
            userId: session.user.id,
            organizationId: activeOrganization.id,
            endpoint: 'GET /api/file/download/[fileId]',
          },
        });

        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Unauthorized' },
          { status: 401 },
        );
      }

      try {
        if (!fileId) {
          return NextResponse.json<ApiResponse<null>>(
            {
              success: false,
              error: 'File ID is required',
            },
            { status: 400 },
          );
        }

        const fileToDownload = await Sentry.startSpan(
          {
            op: 'db.query',
            name: 'Find file to download',
          },
          async () => {
            return await db.query.file.findFirst({
              where: and(
                eq(file.id, fileId),
                eq(file.organizationId, activeOrganization.id),
              ),
              with: {
                folder: {
                  columns: {
                    id: true,
                    organizationId: true,
                  },
                },
              },
            });
          },
        );

        if (!fileToDownload) {
          Sentry.captureMessage('File to download not found', {
            level: 'info',
            tags: {
              fileId,
              organizationId: activeOrganization.id,
              endpoint: 'GET /api/file/download/[fileId]',
            },
          });

          return NextResponse.json<ApiResponse<null>>(
            {
              success: false,
              error: 'File not found',
            },
            { status: 404 },
          );
        }
        else{
          fileName = fileToDownload.s3Key.split("/").pop();
        }

        await Sentry.startSpan(
          {
            op: 's3.get',
            name: 'Download file from S3',
          },
          async (s3Span) => {
            s3Span.setAttribute(
              'bucket',
              Resource.KnowledgebaseDocumentsBucket.name,
            );
            s3Span.setAttribute('s3Key', fileToDownload.s3Key || 'unknown');

            const downloadFileCommand = new GetObjectCommand({
              Bucket: Resource.KnowledgebaseDocumentsBucket.name,
              Key: fileToDownload.s3Key as string,
            });

            const response = await s3Client.send(downloadFileCommand);
            const body = await streamToBuffer(response.Body as Readable);

            return new NextResponse(body, {
              status: 200,
              headers: {
                "Content-Type": response.ContentType || "application/octet-stream",
                "Content-Disposition": `attachment; filename="${fileName}"`,
              },
            });
          },
        );

        Sentry.captureMessage('File successfully deleted', {
          level: 'info',
          tags: {
            fileId,
            organizationId: activeOrganization.id,
            s3Key: fileToDownload.s3Key,
            endpoint: 'GET /api/file/[fileId]',
          },
        });

        return NextResponse.json<ApiResponse<{ id: string }>>(
          {
            success: true,
            data: { id: fileId },
          },
          { status: 200 },
        );
      } catch (error) {
        Sentry.captureException(error);
        console.error('Error downloading file:', error);

        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: 'Internal server error',
          },
          { status: 500 },
        );
      }
    },
  );
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}