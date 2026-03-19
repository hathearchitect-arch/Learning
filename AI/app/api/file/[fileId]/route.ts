'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { file } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth, getSession, getActiveOrganization } from '@/lib/auth';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Resource } from 'sst';
import {
  BedrockAgentClient,
  GetKnowledgeBaseDocumentsCommand,
  DocumentStatus,
} from '@aws-sdk/client-bedrock-agent';
import * as Sentry from '@sentry/nextjs';

const awsRegion = process.env.AWS_REGION;

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type FileType = {
  isVectorized: boolean;
  id: string;
  organizationId: string;
  folderId: string | null;
  status?: DocumentStatus;
  statusReason?: string;
};

const s3Client = new S3Client({
  region: awsRegion,
});

type GetFileParams = Promise<{
  fileId: string;
}>;

type DeleteFileParams = Promise<{
  fileId: string;
}>;

export async function GET(
  request: NextRequest,
  { params }: { params: GetFileParams },
) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'GET /api/file/[fileId]',
    },
    async (span) => {
      const session = await getSession();
      const activeOrganization = await getActiveOrganization(request);

      const { fileId } = await params;

      span.setAttribute('fileId', fileId);
      span.setAttribute('userId', session?.user?.id || 'anonymous');
      span.setAttribute('organizationId', activeOrganization?.id || 'none');

      if (!session?.user || !activeOrganization) {
        Sentry.captureMessage('Unauthorized access attempt to file endpoint', {
          level: 'warning',
          tags: { fileId, endpoint: 'GET /api/file/[fileId]' },
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
        Sentry.captureMessage('Insufficient permissions for file access', {
          level: 'warning',
          tags: {
            fileId,
            userId: session.user.id,
            organizationId: activeOrganization.id,
            endpoint: 'GET /api/file/[fileId]',
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

        const fileObject = await Sentry.startSpan(
          {
            op: 'db.query',
            name: 'Find file by ID',
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

        if (!fileObject) {
          Sentry.captureMessage('File not found', {
            level: 'info',
            tags: {
              fileId,
              organizationId: activeOrganization.id,
              endpoint: 'GET /api/file/[fileId]',
            },
          });

          return NextResponse.json<ApiResponse<null>>(
            {
              success: false,
              error: 'File not found',
            },
            { status: 404 },
          );
        } else {
          // fetch the file ingestion status from bedrock
          const bedrockResult = await Sentry.startSpan(
            {
              op: 'bedrock.query',
              name: 'Get knowledge base document status',
            },
            async (bedrockSpan) => {
              bedrockSpan.setAttribute('s3Key', fileObject.s3Key || 'unknown');
              bedrockSpan.setAttribute(
                'knowledgeBaseId',
                process.env.KNOWLEDGEBASE_ID || 'unknown',
              );

              const bedrockClient = new BedrockAgentClient({
                region: process.env.AWS_REGION || 'us-east-1',
              });
              const knowledgebaseDocumentsBucketName =
                process.env.KNOWLEDGEBASE_BUCKET_NAME;

              return await bedrockClient.send(
                new GetKnowledgeBaseDocumentsCommand({
                  knowledgeBaseId: process.env.KNOWLEDGEBASE_ID,
                  dataSourceId: process.env.KNOWLEDGEBASE_DATA_SOURCE_ID,
                  documentIdentifiers: [
                    {
                      dataSourceType: 'S3',
                      s3: {
                        uri: `s3://${knowledgebaseDocumentsBucketName}/${fileObject.s3Key}`,
                      },
                    },
                  ],
                }),
              );
            },
          );

          // if the document status is INDEXED then mark it as vectorized in the database
          const documentStatus = bedrockResult.documentDetails?.[0]?.status;
          const documentStatusReason =
            bedrockResult.documentDetails?.[0]?.statusReason;

          if (documentStatus === DocumentStatus.INDEXED) {
            await Sentry.startSpan(
              {
                op: 'db.update',
                name: 'Update file vectorization status',
              },
              async () => {
                return await db
                  .update(file)
                  .set({ isVectorized: true })
                  .where(eq(file.id, fileObject.id))
                  .execute();
              },
            );
          }

          const fileResponse: FileType = {
            isVectorized: fileObject.isVectorized,
            id: fileObject.id,
            organizationId: fileObject.organizationId,
            folderId: fileObject.folderId,
            status: documentStatus,
            statusReason: documentStatusReason,
          };

          span.setAttribute('documentStatus', documentStatus || 'unknown');
          span.setAttribute('isVectorized', fileObject.isVectorized);

          return NextResponse.json<ApiResponse<FileType>>(
            {
              success: true,
              data: fileResponse,
            },
            { status: 200 },
          );
        }
      } catch (error) {
        Sentry.captureException(error);

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: DeleteFileParams },
) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'DELETE /api/file/[fileId]',
    },
    async (span) => {
      const session = await getSession();
      const activeOrganization = await getActiveOrganization(request);

      const { fileId } = await params;

      span.setAttribute('fileId', fileId);
      span.setAttribute('userId', session?.user?.id || 'anonymous');
      span.setAttribute('organizationId', activeOrganization?.id || 'none');

      if (!session?.user || !activeOrganization) {
        Sentry.captureMessage('Unauthorized delete attempt on file endpoint', {
          level: 'warning',
          tags: { fileId, endpoint: 'DELETE /api/file/[fileId]' },
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
            file: ['delete'],
          },
        },
      });

      //check if user has org-level permissions
      const organizationPermission = await auth.api.hasPermission({
        headers: request.headers,
        body: {
          organizationId: activeOrganization.id,
          permissions: {
            file: ['delete'],
          },
        },
      });

      if (!adminPermission.success && !organizationPermission.success) {
        Sentry.captureMessage('Insufficient permissions for file deletion', {
          level: 'warning',
          tags: {
            fileId,
            userId: session.user.id,
            organizationId: activeOrganization.id,
            endpoint: 'DELETE /api/file/[fileId]',
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

        const fileToDelete = await Sentry.startSpan(
          {
            op: 'db.query',
            name: 'Find file to delete',
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

        if (!fileToDelete) {
          Sentry.captureMessage('File to delete not found', {
            level: 'info',
            tags: {
              fileId,
              organizationId: activeOrganization.id,
              endpoint: 'DELETE /api/file/[fileId]',
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

        await Sentry.startSpan(
          {
            op: 's3.delete',
            name: 'Delete file from S3',
          },
          async (s3Span) => {
            s3Span.setAttribute(
              'bucket',
              Resource.KnowledgebaseDocumentsBucket.name,
            );
            s3Span.setAttribute('s3Key', fileToDelete.s3Key || 'unknown');

            const deleteFileCommand = new DeleteObjectCommand({
              Bucket: Resource.KnowledgebaseDocumentsBucket.name,
              Key: fileToDelete.s3Key as string,
            });

            return await s3Client.send(deleteFileCommand);
          },
        );

        // get the file from the database
        const deletedFile = await Sentry.startSpan(
          {
            op: 'db.delete',
            name: 'Delete file from database',
          },
          async () => {
            return await db
              .delete(file)
              .where(
                and(
                  eq(file.id, fileId),
                  eq(file.organizationId, activeOrganization.id),
                ),
              )
              .returning();
          },
        );

        Sentry.captureMessage('File successfully deleted', {
          level: 'info',
          tags: {
            fileId,
            organizationId: activeOrganization.id,
            s3Key: fileToDelete.s3Key,
            endpoint: 'DELETE /api/file/[fileId]',
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
        console.error('Error deleting file:', error);

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
