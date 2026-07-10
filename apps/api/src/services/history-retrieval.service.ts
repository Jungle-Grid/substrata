import { Prisma, prisma } from '@substrata/db';

const RETRIEVAL_METHOD = 'postgres_fts_or_v2';
const KEYWORD_FALLBACK_METHOD = 'postgres_keyword_fallback_v1';
const RETRIEVAL_VERSION = 'company_history_retrieval_v2';
const DEFAULT_TOP_K = 3;
const PRIMARY_CANDIDATE_LIMIT = 50;
const DEBUG_RESULT_LIMIT = 10;

const DEFAULT_KEYWORD_FALLBACK_TERMS = [
  'accelerator',
  'AI accelerator',
  'TOPS',
  'HBM',
  'PCIe',
  'ECCN',
  '3A090',
  '3A991',
];

const QUERY_STOP_WORDS = new Set([
  'the',
  'and',
  'with',
  'from',
  'that',
  'this',
  'document',
  'datasheet',
  'upload',
  'new',
  'review',
  'path',
  'paths',
  'current',
  'detected',
  'product',
  'profile',
  'specification',
  'specifications',
]);

type CurrentFact = {
  name: string;
  value: string;
  sourceSnippet?: string | null;
};

type TechnicalConcept = {
  key: string;
  label: string;
  currentPattern: RegExp;
  historyPattern: RegExp;
};

const TECHNICAL_CONCEPTS: TechnicalConcept[] = [
  {
    key: 'ai_accelerator',
    label: 'AI accelerator product family',
    currentPattern: /\b(?:ai\s+accelerator|accelerator\s+(?:card|module)|inference|training)\b/i,
    historyPattern: /\b(?:ai\s+accelerator|accelerator\s+(?:card|module)|inference|training)\b/i,
  },
  {
    key: 'pcie_accelerator_card',
    label: 'PCIe accelerator-card form factor',
    currentPattern: /\bpcie\b/i,
    historyPattern: /\bpcie\b/i,
  },
  {
    key: 'hbm_memory',
    label: 'HBM memory',
    currentPattern: /\bhbm\d*[a-z]*\b/i,
    historyPattern: /\bhbm\d*[a-z]*\b/i,
  },
  {
    key: 'accelerator_performance',
    label: 'high INT8/FP16 performance evidence',
    currentPattern: /\b(?:int8|tops|fp16|tflops)\b/i,
    historyPattern: /\b(?:int8|tops|fp16|tflops)\b/i,
  },
  {
    key: 'firmware_security',
    label: 'firmware-signing or attestation note',
    currentPattern: /\b(?:firmware\s+signing|remote\s+attestation|secure\s+boot)\b/i,
    historyPattern: /\b(?:firmware\s+signing|remote\s+attestation|secure\s+boot)\b/i,
  },
  {
    key: 'category_3_review',
    label: 'Category 3 or advanced-computing review relevance',
    currentPattern: /\b(?:category\s*3|advanced\s+computing|3a09\d|3a991)\b/i,
    historyPattern: /\b(?:category\s*3|advanced\s+computing|3a09\d|3a991)\b/i,
  },
];

type LexicalChunkRow = {
  chunkId: string;
  historyDocumentId: string;
  content: string;
  baseScore: number;
  fileName: string;
  title: string;
  importedAt: Date;
  metadata: Prisma.JsonValue | null;
};

export type CompanyHistoryRetrievalTraceResult = {
  sourceFileName: string;
  chunkPreview: string;
  similarityScore: number;
  matchedTerms: string[];
  exclusionReason: string | null;
};

export type CompanyHistoryRetrievalTrace = {
  organizationId: string;
  query: string;
  queryTerms: string[];
  keywordFallbackTerms: string[];
  topK: number;
  similarityThreshold: null;
  indexMethod: 'postgres_full_text';
  embeddingVectorDimensions: null;
  candidateChunksBeforeFiltering: number;
  candidateChunksAfterFiltering: number;
  primaryCandidateCount: number;
  keywordCandidateCount: number;
  retrievalMethod: string;
  topResults: CompanyHistoryRetrievalTraceResult[];
};

export type RetrievedCompanyHistoryMatch = {
  companyHistoryDocumentId: string;
  companyHistoryChunkId: string;
  sourceFileName: string;
  sourceTitle: string;
  importedAt: Date;
  excerpt: string;
  rank: number;
  score: number;
  matchTier: 'direct' | 'partial' | 'weak';
  matchReasons: string[];
  retrievalMethod: string;
  retrievalVersion: string;
};

export type CompanyHistoryRetrievalResult = {
  matches: RetrievedCompanyHistoryMatch[];
  trace: CompanyHistoryRetrievalTrace;
};

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function exactEccnStrings(text: string) {
  return unique(Array.from(text.matchAll(/\b[0-9][A-E][0-9]{3}(?:\.[A-Za-z0-9]+|[A-Za-z0-9]*)\b/g), (match) => match[0]));
}

function searchableTokens(value: string) {
  return (value.match(/[A-Za-z0-9][A-Za-z0-9_.-]{1,}/g) ?? [])
    .filter((token) => !QUERY_STOP_WORDS.has(token.toLowerCase()));
}

function sourceTechnicalTerms(sourceText: string) {
  return sourceText
    .split(/(?:\r?\n){1,}|(?<=[.!?])\s+/)
    .filter((segment) => /accelerator|hbm|pcie|tops|tflops|performance|firmware|attestation|security|eccn|category\s*3|advanced\s+computing/i.test(segment))
    .flatMap(searchableTokens);
}

function valuesFor(input: CurrentFact[], pattern: RegExp) {
  return input.filter((spec) => pattern.test(spec.name)).map((spec) => spec.value);
}

function querySignals(input: {
  title: string;
  sourceText: string;
  extractedSpecs: CurrentFact[];
  detectedProductProfile?: string | null;
  reviewPathContext?: string[];
  candidateEccns?: string[];
  reviewerQuestions?: string[];
}) {
  const currentProductText = [
    input.title,
    input.sourceText,
    ...input.extractedSpecs.flatMap((spec) => [spec.name, spec.value]),
    input.detectedProductProfile ?? '',
    ...(input.reviewPathContext ?? []),
    ...(input.candidateEccns ?? []),
    ...(input.reviewerQuestions ?? []),
  ].join('\n');
  const identifiers = unique(
    input.extractedSpecs
      .filter((spec) => ['part_number', 'product_name', 'manufacturer', 'model', 'sku'].includes(spec.name))
      .map((spec) => spec.value),
  );
  const productFamilies = unique(valuesFor(input.extractedSpecs, /(?:^|_)product_family$/));
  const performance = unique(valuesFor(input.extractedSpecs, /performance|tops|tflops|throughput|compute/));
  const memory = unique(valuesFor(input.extractedSpecs, /memory|hbm|cache/));
  const interfaces = unique(valuesFor(input.extractedSpecs, /interface|pcie|interconnect|io$/));
  const securityNotes = unique(valuesFor(input.extractedSpecs, /security|crypto|encryption|firmware|attestation|boot/));
  const technicalFacts = unique(
    input.extractedSpecs
      .filter((spec) => !['part_number', 'product_name', 'manufacturer', 'model', 'sku', 'product_family'].includes(spec.name))
      .flatMap((spec) => [spec.value]),
  );
  const extractedProfile = valuesFor(input.extractedSpecs, /(?:^|_)product_profile$/);
  const eccns = unique([
    ...exactEccnStrings(`${input.title}\n${input.sourceText}\n${input.extractedSpecs.map((spec) => spec.value).join('\n')}`),
    ...(input.candidateEccns ?? []),
  ]);
  const queryParts = [
    ...productFamilies,
    ...identifiers,
    ...performance,
    ...memory,
    ...interfaces,
    ...securityNotes,
    ...eccns,
    input.detectedProductProfile ?? '',
    ...extractedProfile,
    ...(input.reviewPathContext ?? []),
    ...(input.reviewerQuestions ?? []),
    ...technicalFacts,
    ...sourceTechnicalTerms(input.sourceText),
    ...searchableTokens(input.title),
  ];
  const queryTerms = unique(queryParts.flatMap(searchableTokens)).slice(0, 48);
  const keywordFallbackTerms = unique([
    ...productFamilies,
    ...interfaces,
    ...memory,
    ...performance,
    ...eccns,
    ...DEFAULT_KEYWORD_FALLBACK_TERMS,
  ]).slice(0, 24);
  const query = unique([
    input.title,
    ...identifiers,
    ...productFamilies,
    input.detectedProductProfile ?? '',
    ...performance,
    ...memory,
    ...interfaces,
    ...securityNotes,
    ...eccns,
    ...(input.reviewPathContext ?? []),
    ...(input.reviewerQuestions ?? []),
  ]).join('; ');
  const technicalConcepts = TECHNICAL_CONCEPTS.filter((concept) =>
    concept.currentPattern.test(currentProductText),
  );

  return {
    identifiers,
    productFamilies,
    technicalFacts,
    eccns,
    query,
    queryTerms,
    keywordFallbackTerms,
    technicalConcepts,
  };
}

function normalizedMetadataStrings(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  const record = metadata as Record<string, unknown>;
  const values: string[] = [];
  for (const key of ['productIdentifiers', 'skuModelStrings', 'eccnMentions']) {
    const entries = record[key];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (entry && typeof entry === 'object' && 'value' in entry && typeof entry.value === 'string') {
        values.push(entry.value);
      }
    }
  }
  return unique(values);
}

function matchedTerms(row: LexicalChunkRow, terms: string[], technicalConcepts: TechnicalConcept[]) {
  const haystack = `${row.title}\n${row.fileName}\n${row.content}\n${normalizedMetadataStrings(row.metadata).join('\n')}`.toLowerCase();
  return unique([
    ...terms.filter((term) => term.length >= 2 && haystack.includes(term.toLowerCase())),
    ...technicalConcepts
      .filter((concept) => concept.historyPattern.test(haystack))
      .map((concept) => concept.label),
  ]).slice(0, 12);
}

function scoreCompanyHistoryResult(input: {
  row: LexicalChunkRow;
  identifiers: string[];
  productFamilies: string[];
  technicalFacts: string[];
  eccns: string[];
  technicalConcepts: TechnicalConcept[];
}) {
  const haystack = `${input.row.title}\n${input.row.fileName}\n${input.row.content}\n${normalizedMetadataStrings(input.row.metadata).join('\n')}`.toLowerCase();
  const reasons: string[] = [];
  let boost = 0;

  const exactIdentifiers = input.identifiers.filter((value) => value.length >= 3 && haystack.includes(value.toLowerCase()));
  if (exactIdentifiers.length) {
    boost += 6 + exactIdentifiers.length;
    reasons.push(`Exact product identifier match: ${exactIdentifiers.slice(0, 2).join(', ')}`);
  }

  const familyMatches = input.productFamilies.filter((value) => value.length >= 3 && haystack.includes(value.toLowerCase()));
  if (familyMatches.length) {
    boost += 3;
    reasons.push(`Related product family: ${familyMatches.slice(0, 2).join(', ')}`);
  }

  const factMatches = input.technicalFacts.filter((value) => value.length >= 3 && haystack.includes(value.toLowerCase()));
  if (factMatches.length) {
    boost += Math.min(3, factMatches.length * 0.75);
    reasons.push(`Shared technical evidence: ${factMatches.slice(0, 3).join(', ')}`);
  }

  const eccnMatches = input.eccns.filter((value) => haystack.includes(value.toLowerCase()));
  if (eccnMatches.length) {
    boost += 1.5;
    reasons.push(`Exact ECCN-looking string appears in both records: ${eccnMatches.slice(0, 2).join(', ')}`);
  }

  const conceptMatches = input.technicalConcepts.filter((concept) => concept.historyPattern.test(haystack));
  if (conceptMatches.length) {
    boost += Math.min(3.5, conceptMatches.length * 0.65);
    reasons.push(`Shared product characteristics: ${conceptMatches.slice(0, 5).map((concept) => concept.label).join('; ')}`);
  }

  if (!reasons.length) {
    reasons.push('Lexical similarity to the current product description and extracted technical facts.');
  }

  const matchTier = exactIdentifiers.length
    ? 'direct'
    : factMatches.length >= 2 || familyMatches.length
      ? 'partial'
      : 'weak';

  return {
    score: input.row.baseScore + boost,
    matchTier,
    matchReasons: reasons,
  } as const;
}

function deduplicateByHistoryDocument<T extends { row: LexicalChunkRow; score: number }>(results: T[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    if (seen.has(result.row.historyDocumentId)) return false;
    seen.add(result.row.historyDocumentId);
    return true;
  });
}

async function findEligibleCompanyHistoryChunkCount(organizationId: string) {
  return prisma.companyHistoryChunk.count({
    where: {
      organizationId,
      companyHistoryDocument: {
        organizationId,
        ingestionStatus: 'indexed',
      },
    },
  });
}

async function findPrimaryCandidates(input: { organizationId: string; ftsQuery: string }) {
  return prisma.$queryRaw<LexicalChunkRow[]>(Prisma.sql`
    SELECT
      chunk."id" AS "chunkId",
      history."id" AS "historyDocumentId",
      chunk."content" AS "content",
      ts_rank_cd(to_tsvector('simple', chunk."content"), websearch_to_tsquery('simple', ${input.ftsQuery}))::float8 AS "baseScore",
      document."fileName" AS "fileName",
      document."title" AS "title",
      history."createdAt" AS "importedAt",
      history."metadata" AS "metadata"
    FROM "CompanyHistoryChunk" chunk
    INNER JOIN "CompanyHistoryDocument" history ON history."id" = chunk."companyHistoryDocumentId"
    INNER JOIN "Document" document ON document."id" = history."documentId"
    WHERE chunk."organizationId" = ${input.organizationId}
      AND history."organizationId" = ${input.organizationId}
      AND history."ingestionStatus" = 'indexed'::"CompanyHistoryIngestionStatus"
      AND chunk."ingestionVersion" = history."ingestionVersion"
      AND to_tsvector('simple', chunk."content") @@ websearch_to_tsquery('simple', ${input.ftsQuery})
    ORDER BY "baseScore" DESC, chunk."createdAt" DESC
    LIMIT ${PRIMARY_CANDIDATE_LIMIT}
  `);
}

async function findKeywordFallbackCandidates(input: { organizationId: string; terms: string[] }) {
  if (!input.terms.length) return [] as LexicalChunkRow[];
  const conditions = input.terms.map((term) => Prisma.sql`
    LOWER(chunk."content") LIKE ${`%${term.toLowerCase()}%`}
  `);

  return prisma.$queryRaw<LexicalChunkRow[]>(Prisma.sql`
    SELECT
      chunk."id" AS "chunkId",
      history."id" AS "historyDocumentId",
      chunk."content" AS "content",
      0::float8 AS "baseScore",
      document."fileName" AS "fileName",
      document."title" AS "title",
      history."createdAt" AS "importedAt",
      history."metadata" AS "metadata"
    FROM "CompanyHistoryChunk" chunk
    INNER JOIN "CompanyHistoryDocument" history ON history."id" = chunk."companyHistoryDocumentId"
    INNER JOIN "Document" document ON document."id" = history."documentId"
    WHERE chunk."organizationId" = ${input.organizationId}
      AND history."organizationId" = ${input.organizationId}
      AND history."ingestionStatus" = 'indexed'::"CompanyHistoryIngestionStatus"
      AND chunk."ingestionVersion" = history."ingestionVersion"
      AND (${Prisma.join(conditions, ' OR ')})
    ORDER BY chunk."createdAt" DESC
    LIMIT ${PRIMARY_CANDIDATE_LIMIT}
  `);
}

export async function retrieveCompanyHistoryWithTrace(input: {
  organizationId: string;
  documentTitle: string;
  sourceText: string;
  extractedSpecs: CurrentFact[];
  detectedProductProfile?: string | null;
  reviewPathContext?: string[];
  candidateEccns?: string[];
  reviewerQuestions?: string[];
  limit?: number;
}): Promise<CompanyHistoryRetrievalResult> {
  const signals = querySignals({
    title: input.documentTitle,
    sourceText: input.sourceText,
    extractedSpecs: input.extractedSpecs,
    detectedProductProfile: input.detectedProductProfile,
    reviewPathContext: input.reviewPathContext,
    candidateEccns: input.candidateEccns,
    reviewerQuestions: input.reviewerQuestions,
  });
  const topK = input.limit ?? DEFAULT_TOP_K;
  const candidateChunksBeforeFiltering = await prisma.companyHistoryChunk.count({
    where: { organizationId: input.organizationId },
  });

  if (!signals.queryTerms.length) {
    return {
      matches: [],
      trace: {
        organizationId: input.organizationId,
        query: signals.query,
        queryTerms: [],
        keywordFallbackTerms: signals.keywordFallbackTerms,
        topK,
        similarityThreshold: null,
        indexMethod: 'postgres_full_text',
        embeddingVectorDimensions: null,
        candidateChunksBeforeFiltering,
        candidateChunksAfterFiltering: 0,
        primaryCandidateCount: 0,
        keywordCandidateCount: 0,
        retrievalMethod: RETRIEVAL_METHOD,
        topResults: [],
      },
    };
  }

  const ftsQuery = signals.queryTerms.join(' OR ');
  const [candidateChunksAfterFiltering, primaryRows] = await Promise.all([
    findEligibleCompanyHistoryChunkCount(input.organizationId),
    findPrimaryCandidates({ organizationId: input.organizationId, ftsQuery }),
  ]);
  const keywordRows = primaryRows.length
    ? []
    : await findKeywordFallbackCandidates({
      organizationId: input.organizationId,
      terms: signals.keywordFallbackTerms,
    });
  const retrievalMethod = primaryRows.length ? RETRIEVAL_METHOD : KEYWORD_FALLBACK_METHOD;
  const rows = primaryRows.length ? primaryRows : keywordRows;
  const ranked = deduplicateByHistoryDocument(
    rows
      .map((row) => ({ row, ...scoreCompanyHistoryResult({ row, ...signals }) }))
      .sort((left, right) => right.score - left.score),
  );
  const matches = ranked.slice(0, topK).map((result, index) => ({
    companyHistoryDocumentId: result.row.historyDocumentId,
    companyHistoryChunkId: result.row.chunkId,
    sourceFileName: result.row.fileName,
    sourceTitle: result.row.title,
    importedAt: result.row.importedAt,
    excerpt: result.row.content,
    rank: index + 1,
    score: result.score,
    matchTier: result.matchTier,
    matchReasons: result.matchReasons,
    retrievalMethod,
    retrievalVersion: RETRIEVAL_VERSION,
  }));

  return {
    matches,
    trace: {
      organizationId: input.organizationId,
      query: signals.query,
      queryTerms: signals.queryTerms,
      keywordFallbackTerms: signals.keywordFallbackTerms,
      topK,
      similarityThreshold: null,
      indexMethod: 'postgres_full_text',
      embeddingVectorDimensions: null,
      candidateChunksBeforeFiltering,
      candidateChunksAfterFiltering,
      primaryCandidateCount: primaryRows.length,
      keywordCandidateCount: keywordRows.length,
      retrievalMethod,
      topResults: ranked.slice(0, DEBUG_RESULT_LIMIT).map((result) => ({
        sourceFileName: result.row.fileName,
        chunkPreview: result.row.content.replace(/\s+/g, ' ').slice(0, 500),
        similarityScore: result.score,
        matchedTerms: matchedTerms(result.row, signals.queryTerms, signals.technicalConcepts),
        exclusionReason: null,
      })),
    },
  };
}

export async function retrieveCompanyHistory(input: {
  organizationId: string;
  documentTitle: string;
  sourceText: string;
  extractedSpecs: CurrentFact[];
  detectedProductProfile?: string | null;
  reviewPathContext?: string[];
  candidateEccns?: string[];
  reviewerQuestions?: string[];
  limit?: number;
}): Promise<RetrievedCompanyHistoryMatch[]> {
  return (await retrieveCompanyHistoryWithTrace(input)).matches;
}

export function appendCompanyHistoryComparison(
  memoMarkdown: string,
  matches: RetrievedCompanyHistoryMatch[],
) {
  const header = '## Company History Comparison';
  const beforeExisting = memoMarkdown.split(`\n${header}`)[0]?.trimEnd() ?? memoMarkdown.trimEnd();
  const section = matches.length
    ? [
        header,
        '- Similar company history found. These are internal reference materials for qualified reviewer comparison, not regulatory authority.',
        ...matches.flatMap((match) => [
          `- **${match.matchTier === 'direct' ? 'Similar company history found' : match.matchTier === 'partial' ? 'Partially similar company history found' : 'Potentially related company history'} — ${match.sourceFileName}**`,
          `  - Match reason: ${match.matchReasons.join('; ')}`,
          `  - Source excerpt: “${match.excerpt.replace(/\s+/g, ' ').slice(0, 900)}”`,
        ]),
        '- Internal company history only. Not regulatory authority; reviewer confirmation remains required.',
      ].join('\n')
    : [
        header,
        '- No comparable prior company history found in this organization’s indexed internal reference material.',
        '- Internal company history is optional reviewer context and not regulatory authority.',
      ].join('\n');

  return `${beforeExisting}\n\n${section}\n`;
}
