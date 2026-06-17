import { prisma } from '@substrata/db';
import type { DocumentCreateInput } from '@substrata/shared';

export async function createDocument(
  organizationId: string,
  input: DocumentCreateInput,
) {
  return prisma.document.create({
    data: {
      organizationId,
      title: input.title,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storagePath: input.storagePath,
      rawText: input.rawText,
      sourceType: input.sourceType,
    },
  });
}

export async function listDocuments(organizationId: string) {
  return prisma.document.findMany({
    where: { organizationId },
    include: {
      classificationRuns: {
        orderBy: { createdAt: 'desc' },
        include: {
          reviewMemo: true,
          humanReviews: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getDocument(organizationId: string, id: string) {
  return prisma.document.findFirst({
    where: {
      id,
      organizationId,
    },
    include: {
      classificationRuns: {
        orderBy: { createdAt: 'desc' },
        include: {
          extractedSpecs: true,
          eccnCandidates: {
            include: {
              citations: true,
            },
          },
          citations: true,
          reviewMemo: true,
          humanReviews: true,
        },
      },
      organization: true,
    },
  });
}
