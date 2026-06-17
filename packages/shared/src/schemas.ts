import { z } from 'zod';

export const confidenceLevelSchema = z.enum(['high', 'medium', 'low']);

export const uncertaintyFlagSchema = z.enum([
  'missing_key_specs',
  'ambiguous_datasheet_language',
  'multiple_plausible_eccns',
  'limited_regulatory_coverage',
  'requires_engineering_confirmation',
]);

export const documentCreateSchema = z.object({
  title: z.string().min(1).max(255),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  storagePath: z.string().min(1),
  sizeBytes: z.number().int().nonnegative().optional(),
  rawText: z.string().optional(),
  sourceType: z.enum(['upload', 'seed', 'manual']).default('upload'),
});

export const classificationRunCreateSchema = z.object({
  trigger: z.enum(['manual', 'api', 'reprocess']).default('manual'),
});

export const reviewSubmissionSchema = z.object({
  status: z.enum([
    'pending_review',
    'reviewed',
    'needs_more_information',
    'rejected',
  ]),
  note: z.string().trim().max(4000).optional().default(''),
});

export const extractedSpecSchema = z.object({
  name: z.string(),
  value: z.string(),
  unit: z.string().nullable().optional(),
  sourceSnippet: z.string(),
  importance: z.string(),
  category: z.string(),
  confidence: confidenceLevelSchema,
});

export const regulatoryCitationSchema = z.object({
  citationLabel: z.string(),
  citationText: z.string(),
  source: z.string(),
  relevance: z.string(),
});

export const eccnCandidateSchema = z.object({
  eccn: z.string(),
  title: z.string(),
  confidence: confidenceLevelSchema,
  matchedTechnicalFacts: z.array(z.string()),
  regulatoryCitations: z.array(regulatoryCitationSchema),
  whyItMayApply: z.string(),
  whyItMayNotApply: z.string(),
  missingInformation: z.array(z.string()),
  uncertaintyFlags: z.array(uncertaintyFlagSchema),
  reviewerQuestions: z.array(z.string()),
});

export const workerOutputSchema = z.object({
  documentId: z.string(),
  organizationId: z.string(),
  requiresHumanReview: z.literal(true),
  confidence: z.number().min(0).max(1),
  uncertaintyFlags: z.array(uncertaintyFlagSchema),
  extractedSpecs: z.array(extractedSpecSchema),
  eccnCandidates: z.array(eccnCandidateSchema),
  memoMarkdown: z.string(),
  artifacts: z.object({
    extractedTextPath: z.string(),
    structuredOutputPath: z.string(),
    memoPath: z.string(),
  }),
});

export const workerCliOutputSchema = z.object({
  document_id: z.string(),
  organization_id: z.string(),
  requires_human_review: z.literal(true),
  confidence: z.number().min(0).max(1),
  uncertainty_flags: z.array(uncertaintyFlagSchema),
  extracted_specs: z.array(
    z.object({
      name: z.string(),
      value: z.string(),
      unit: z.string().nullable().optional(),
      source_snippet: z.string(),
      importance: z.string(),
      category: z.string(),
      confidence: confidenceLevelSchema,
    }),
  ),
  eccn_candidates: z.array(
    z.object({
      eccn: z.string(),
      title: z.string(),
      confidence: confidenceLevelSchema,
      matched_technical_facts: z.array(z.string()),
      regulatory_citations: z.array(
        z.object({
          citation_label: z.string(),
          citation_text: z.string(),
          source: z.string(),
          relevance: z.string(),
        }),
      ),
      why_it_may_apply: z.string(),
      why_it_may_not_apply: z.string(),
      missing_information: z.array(z.string()),
      uncertainty_flags: z.array(uncertaintyFlagSchema),
      reviewer_questions: z.array(z.string()),
    }),
  ),
  memo_markdown: z.string(),
  artifacts: z.object({
    extracted_text_path: z.string(),
    structured_output_path: z.string(),
    memo_path: z.string(),
  }),
});

export type DocumentCreateInput = z.infer<typeof documentCreateSchema>;
export type ClassificationRunCreateInput = z.infer<
  typeof classificationRunCreateSchema
>;
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;
export type WorkerOutput = z.infer<typeof workerOutputSchema>;
export type WorkerCliOutput = z.infer<typeof workerCliOutputSchema>;
