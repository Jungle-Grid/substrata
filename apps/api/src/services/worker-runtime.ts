import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  type WorkerCliOutput,
  type WorkerOutput,
  workerCliOutputSchema,
} from '@substrata/shared';
import { HttpError } from '../lib/errors';
import { getLocalStorageRoot, workerEntryPoint } from '../lib/paths';

const execFileAsync = promisify(execFile);

function mapCliOutput(output: WorkerCliOutput): WorkerOutput {
  return {
    documentId: output.document_id,
    organizationId: output.organization_id,
    requiresHumanReview: output.requires_human_review,
    confidence: output.confidence,
    uncertaintyFlags: output.uncertainty_flags,
    extractedSpecs: output.extracted_specs.map((spec) => ({
      name: spec.name,
      value: spec.value,
      unit: spec.unit ?? null,
      sourceSnippet: spec.source_snippet,
      importance: spec.importance,
      category: spec.category,
      confidence: spec.confidence,
    })),
    eccnCandidates: output.eccn_candidates.map((candidate) => ({
      eccn: candidate.eccn,
      title: candidate.title,
      confidence: candidate.confidence,
      matchedTechnicalFacts: candidate.matched_technical_facts,
      regulatoryCitations: candidate.regulatory_citations.map((citation) => ({
        citationLabel: citation.citation_label,
        citationText: citation.citation_text,
        source: citation.source,
        relevance: citation.relevance,
      })),
      whyItMayApply: candidate.why_it_may_apply,
      whyItMayNotApply: candidate.why_it_may_not_apply,
      missingInformation: candidate.missing_information,
      uncertaintyFlags: candidate.uncertainty_flags,
      reviewerQuestions: candidate.reviewer_questions,
    })),
    memoMarkdown: output.memo_markdown,
    artifacts: {
      extractedTextPath: output.artifacts.extracted_text_path,
      structuredOutputPath: output.artifacts.structured_output_path,
      memoPath: output.artifacts.memo_path,
    },
    runMetadata: output.run_metadata ?? null,
  };
}

export async function runLocalWorker(input: {
  documentId: string;
  organizationId: string;
  sourceText: string;
  documentTitle: string;
  documentMetadata: {
    fileName: string;
    mimeType: string;
    sizeBytes: number | null;
    sourceType: string;
  };
}) {
  const runDir = path.join(
    getLocalStorageRoot(),
    'worker-inputs',
    input.documentId,
  );
  await fs.mkdir(runDir, { recursive: true });

  const textPath = path.join(runDir, 'document.txt');
  const payloadPath = path.join(runDir, 'payload.json');

  await fs.writeFile(textPath, input.sourceText, 'utf8');
  await fs.writeFile(
    payloadPath,
    JSON.stringify(
      {
        document_id: input.documentId,
        document_title: input.documentTitle,
        file_path: textPath,
        organization_id: input.organizationId,
        document_metadata: input.documentMetadata,
      },
      null,
      2,
    ),
    'utf8',
  );

  try {
    const { stdout } = await execFileAsync('python3', [workerEntryPoint, payloadPath], {
      maxBuffer: 1024 * 1024 * 4,
    });

    const parsed = workerCliOutputSchema.parse(JSON.parse(stdout));
    return mapCliOutput(parsed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Local worker execution failed.';
    throw new HttpError(500, 'Classification worker failed.', { message });
  }
}
