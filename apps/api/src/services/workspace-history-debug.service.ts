import { prisma } from '@substrata/db';

function preview(text: string | null, length = 500) {
  return text?.replace(/\s+/g, ' ').trim().slice(0, length) ?? '';
}

export async function getWorkspaceHistoryStatus(input: {
  organizationId: string;
  currentUserId: string;
}) {
  const organizationId = input.organizationId;
  const [
    referenceBatchCount,
    referenceFileCount,
    parsedFileCount,
    indexedChunkCount,
    latestReferenceFiles,
    latestChunks,
    latestReviewRuns,
  ] = await Promise.all([
    prisma.companyHistoryBatch.count({ where: { organizationId } }),
    prisma.companyHistoryDocument.count({ where: { organizationId } }),
    prisma.companyHistoryDocument.count({
      where: {
        organizationId,
        ingestionStatus: 'indexed',
        document: { rawText: { not: null } },
      },
    }),
    prisma.companyHistoryChunk.count({ where: { organizationId } }),
    prisma.companyHistoryDocument.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        batch: { select: { id: true, name: true, createdAt: true } },
        document: {
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            sizeBytes: true,
            storagePath: true,
            rawText: true,
            extractionStatus: true,
            extractionError: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.companyHistoryChunk.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        companyHistoryDocument: {
          include: {
            document: { select: { fileName: true } },
          },
        },
      },
    }),
    prisma.classificationRun.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        document: { select: { id: true, fileName: true, title: true } },
        companyHistoryMatches: {
          select: {
            id: true,
            companyHistoryDocumentId: true,
            companyHistoryChunkId: true,
            score: true,
            rank: true,
            retrievalMethod: true,
            createdAt: true,
          },
          orderBy: { rank: 'asc' },
        },
      },
    }),
  ]);

  const latestReviewOrganizationId = latestReviewRuns[0]?.organizationId ?? null;
  const latestReferenceOrganizationId = latestReferenceFiles[0]?.organizationId ?? null;

  return {
    current_user_id: input.currentUserId,
    current_org_id: organizationId,
    current_workspace_id: organizationId,
    index: {
      method: 'postgres_full_text',
      embedding_status: 'not_configured',
      embedding_vector_dimensions: null,
    },
    counts: {
      reference_batches: referenceBatchCount,
      reference_files: referenceFileCount,
      parsed_files: parsedFileCount,
      indexed_chunks: indexedChunkCount,
    },
    latest_reference_files: latestReferenceFiles.map((historyFile) => ({
      reference_file_id: historyFile.id,
      document_id: historyFile.documentId,
      org_id: historyFile.organizationId,
      workspace_id: historyFile.organizationId,
      batch_id: historyFile.batchId,
      batch_name: historyFile.batch.name,
      material_type: historyFile.recordType,
      file_name: historyFile.document.fileName,
      mime_type: historyFile.document.mimeType,
      size: historyFile.document.sizeBytes,
      storage_path: historyFile.document.storagePath,
      created_at: historyFile.createdAt,
      parser_status: historyFile.ingestionStatus,
      parser_error: historyFile.errorMessage ?? historyFile.document.extractionError,
      extracted_text_length: historyFile.document.rawText?.length ?? 0,
      first_500_characters: preview(historyFile.document.rawText),
      index_status: historyFile.ingestionStatus,
      ingestion_version: historyFile.ingestionVersion,
      attempt_count: historyFile.attemptCount,
      duplicate_of_reference_file_id: historyFile.duplicateOfHistoryDocumentId,
    })),
    latest_chunks: latestChunks.map((chunk) => ({
      chunk_id: chunk.id,
      org_id: chunk.organizationId,
      workspace_id: chunk.organizationId,
      reference_file_id: chunk.companyHistoryDocumentId,
      source_file_name: chunk.companyHistoryDocument.document.fileName,
      ordinal: chunk.ordinal,
      ingestion_version: chunk.ingestionVersion,
      text_length: chunk.content.length,
      text_preview: preview(chunk.content),
      created_at: chunk.createdAt,
      index_method: 'postgres_full_text',
      embedding_vector_dimensions: null,
    })),
    latest_review_runs: latestReviewRuns.map((run) => ({
      review_run_id: run.id,
      org_id: run.organizationId,
      workspace_id: run.organizationId,
      document_id: run.documentId,
      document_title: run.document.title,
      source_file_name: run.document.fileName,
      status: run.status,
      created_at: run.createdAt,
      company_history_match_count: run.companyHistoryMatches.length,
      company_history_matches: run.companyHistoryMatches.map((match) => ({
        reference_file_id: match.companyHistoryDocumentId,
        chunk_id: match.companyHistoryChunkId,
        rank: match.rank,
        score: match.score,
        retrieval_method: match.retrievalMethod,
        created_at: match.createdAt,
      })),
    })),
    latest_review_org_id: latestReviewOrganizationId,
    latest_reference_org_id: latestReferenceOrganizationId,
    latest_review_org_matches_reference_org: Boolean(
      latestReviewOrganizationId &&
      latestReferenceOrganizationId &&
      latestReviewOrganizationId === latestReferenceOrganizationId,
    ),
  };
}
