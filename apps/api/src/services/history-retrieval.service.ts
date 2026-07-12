import { Prisma, prisma } from '@substrata/db';

const RETRIEVAL_METHOD = 'postgres_source_fact_v3';
const KEYWORD_FALLBACK_METHOD = 'postgres_keyword_fallback_v1';
const RETRIEVAL_VERSION = 'company_history_retrieval_v4';
const DEFAULT_TOP_K = 3;
const PRIMARY_CANDIDATE_LIMIT = 50;
const DEBUG_RESULT_LIMIT = 10;

const DEFAULT_KEYWORD_FALLBACK_TERMS: string[] = [];

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
  category?: string | null;
  valueType?: string | null;
};

type TechnicalConcept = {
  key: string;
  label: string;
  currentPattern: RegExp;
  historyPattern: RegExp;
};

const TECHNICAL_CONCEPTS: TechnicalConcept[] = [
  {
    key: 'network_card_form',
    label: 'networking-card or SmartNIC product form',
    currentPattern: /\b(?:smartnic|network interface card|network adapter|networking card)\b/i,
    historyPattern: /\b(?:smartnic|network interface card|network adapter|networking card)\b/i,
  },
  {
    key: 'networking',
    label: 'Ethernet or networking capability',
    currentPattern: /\b(?:ethernet|router|gateway|network interface)\b/i,
    historyPattern: /\b(?:ethernet|router|gateway|network interface)\b/i,
  },
  {
    key: 'high_speed_ethernet',
    label: 'high-speed Ethernet interface',
    currentPattern: /\b(?:25|40|50|100|200|400)\s*(?:g|gb)e\b|\b(?:25|40|50|100|200|400)gbe\b/i,
    historyPattern: /\b(?:25|40|50|100|200|400)\s*(?:g|gb)e\b|\b(?:25|40|50|100|200|400)gbe\b/i,
  },
  {
    key: 'macsec',
    label: 'MACsec link-layer encryption',
    currentPattern: /\bmacsec\b/i,
    historyPattern: /\bmacsec\b/i,
  },
  {
    key: 'tls_offload',
    label: 'TLS offload or transport-security capability',
    currentPattern: /\b(?:tls offload|tls transport|https transport)\b/i,
    historyPattern: /\b(?:tls offload|tls transport|https transport)\b/i,
  },
  {
    key: 'transport_security',
    label: 'TLS secure-transport capability',
    currentPattern: /\b(?:mqtt over tls|tls transport|https)\b/i,
    historyPattern: /\b(?:mqtt over tls|tls transport|https)\b/i,
  },
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
];

type LexicalChunkRow = {
  chunkId: string;
  chunkOrdinal: number;
  historyDocumentId: string;
  content: string;
  baseScore: number;
  fileName: string;
  title: string;
  importedAt: Date;
  metadata: Prisma.JsonValue | null;
  recordType: string;
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
  recordLocator?: string;
  recordLocatorMetadata?: {
    kind: 'csv_row' | 'json_object' | 'document_chunk';
    rowNumber?: number;
    jsonPointer?: string;
    recordId?: string;
    chunkOrdinal: number;
  };
  importedAt: Date;
  excerpt: string;
  rank: number;
  score: number;
  matchTier: 'direct' | 'partial' | 'weak';
  matchReasons: string[];
  retrievalMethod: string;
  retrievalVersion: string;
  supportingMatches: string[];
  materialDifferences: string[];
  blockingContradictions: string[];
  similarityComponents: Record<string, number>;
  recommendedUse: 'precedent' | 'partial_precedent' | 'contrast' | 'context' | 'irrelevant';
  recordRole: HistoryDocumentRole;
  agreements: string[];
  configurationDifferences: string[];
};

export type HistoryDocumentRole =
  | 'product_precedent'
  | 'technical_source'
  | 'classification_memo'
  | 'review_worksheet'
  | 'counsel_guidance'
  | 'internal_policy'
  | 'regulatory_material'
  | 'dataset_readme'
  | 'administrative'
  | 'unclassified';

export type CanonicalHistoryPools = {
  productPrecedents: RetrievedCompanyHistoryMatch[];
  technicalComparisons: RetrievedCompanyHistoryMatch[];
  counselGuidance: RetrievedCompanyHistoryMatch[];
  internalPolicy: RetrievedCompanyHistoryMatch[];
  regulatoryContext: RetrievedCompanyHistoryMatch[];
  excludedAdministrative: RetrievedCompanyHistoryMatch[];
};

export type CompanyHistoryRetrievalResult = {
  matches: RetrievedCompanyHistoryMatch[];
  pools: CanonicalHistoryPools;
  trace: CompanyHistoryRetrievalTrace;
};

export type HistoryProjectionValidationIssue = {
  code:
    | 'HISTORY_ROLE_SECTION_MISMATCH'
    | 'STRUCTURED_HISTORY_RECORD_LEAKAGE'
    | 'STRUCTURED_HISTORY_LOCATOR_MISMATCH'
    | 'STRUCTURED_HISTORY_CONTAINER_EXCERPT'
    | 'CANONICAL_HISTORY_RENDER_MISMATCH';
  message: string;
};

/** Validates the immutable API-side history projection before memo persistence. */
export function validateHistoryProjection(
  pools: Pick<CanonicalHistoryPools, 'productPrecedents' | 'technicalComparisons' | 'counselGuidance' | 'internalPolicy'>,
) {
  const issues: HistoryProjectionValidationIssue[] = [];
  const assertPool = (matches: RetrievedCompanyHistoryMatch[], allowed: HistoryDocumentRole[], pool: string) => {
    for (const match of matches) {
      if (!allowed.includes(match.recordRole)) {
        issues.push({ code: 'HISTORY_ROLE_SECTION_MISMATCH', message: `${match.sourceFileName} (${match.recordRole}) is not allowed in ${pool}.` });
      }
      if (match.recordLocatorMetadata?.kind === 'csv_row') {
        if (!match.recordLocatorMetadata.rowNumber || !match.recordLocator?.startsWith('CSV row ')) {
          issues.push({ code: 'STRUCTURED_HISTORY_LOCATOR_MISMATCH', message: `${match.sourceFileName} lost its CSV row locator.` });
        }
        const ids = match.excerpt.match(/(?:record[ _-]?id|case[ _-]?id|^id)\s*:\s*[^\n]+/gim) ?? [];
        if (ids.length > 1) {
          issues.push({ code: 'STRUCTURED_HISTORY_RECORD_LEAKAGE', message: `${match.sourceFileName} CSV excerpt contains multiple logical records.` });
        }
        if (match.recordLocatorMetadata.recordId && !match.excerpt.toLowerCase().includes(match.recordLocatorMetadata.recordId.toLowerCase())) {
          issues.push({ code: 'STRUCTURED_HISTORY_LOCATOR_MISMATCH', message: `${match.sourceFileName} excerpt does not contain its selected record ID.` });
        }
      }
    }
  };
  assertPool(pools.productPrecedents, ['product_precedent', 'classification_memo', 'review_worksheet'], 'productPrecedents');
  assertPool(pools.technicalComparisons, ['technical_source', 'classification_memo', 'product_precedent', 'review_worksheet'], 'contrastRecords');
  assertPool(pools.counselGuidance, ['counsel_guidance'], 'counselGuidance');
  assertPool(pools.internalPolicy, ['internal_policy'], 'internalPolicy');
  return issues;
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function searchableTokens(value: string) {
  return (value.match(/[A-Za-z0-9][A-Za-z0-9_.-]{1,}/g) ?? [])
    .filter((token) => !QUERY_STOP_WORDS.has(token.toLowerCase()));
}

function sourceTechnicalTerms(sourceText: string) {
  return sourceText
    .split(/(?:\r?\n){1,}|(?<=[.!?])\s+/)
    .filter((segment) => /accelerator|hbm|pcie|tops|tflops|performance|firmware|attestation|security|processor|radio|wireless|ethernet|memory|sensor|fpga|encryption/i.test(segment))
    .flatMap(searchableTokens);
}

function isSourceFact(spec: CurrentFact) {
  return spec.category !== 'profile_detection' &&
    spec.category !== 'normalized_technical_signal' &&
    !spec.name.startsWith('heuristic_signal_') &&
    !['product_profile', 'profile_confidence', 'profile_rationale', 'secondary_product_profile'].includes(spec.name);
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
  historyRecordHints?: string[];
}) {
  const sourceFacts = input.extractedSpecs.filter(isSourceFact);
  const currentProductText = [
    input.sourceText,
    ...sourceFacts.flatMap((spec) => [spec.name, spec.value, spec.sourceSnippet ?? '']),
  ].join('\n');
  const identifiers = unique(
    sourceFacts
      .filter((spec) => ['part_number', 'product_name', 'manufacturer', 'model', 'sku'].includes(spec.name))
      .map((spec) => spec.value),
  );
  const productFamilies = unique(valuesFor(sourceFacts, /(?:^|_)product_family$/));
  const performance = unique(valuesFor(sourceFacts, /performance|tops|tflops|throughput|compute/));
  const memory = unique(valuesFor(sourceFacts, /memory|hbm|cache/));
  const interfaces = unique(valuesFor(sourceFacts, /interface|pcie|interconnect|io$/));
  const securityNotes = unique(valuesFor(sourceFacts, /security|crypto|encryption|firmware|attestation|boot/));
  const technicalFacts = unique(
    sourceFacts
      .filter((spec) => !['part_number', 'product_name', 'manufacturer', 'model', 'sku', 'product_family'].includes(spec.name))
      .flatMap((spec) => [spec.value]),
  );
  // Generated profiles, paths, reviewer prose, and candidate ECCNs are
  // hypotheses and are prohibited from this primary source-fact query.
  const eccns: string[] = [];
  const queryParts = [
    ...productFamilies,
    ...identifiers,
    ...performance,
    ...memory,
    ...interfaces,
    ...securityNotes,
    ...technicalFacts,
    ...sourceTechnicalTerms(input.sourceText),
    // Explicit internal-record references are retrieval hints, never source
    // facts or candidate evidence. They are supplied only after entity typing.
    ...(input.historyRecordHints ?? []),
  ];
  const queryTerms = unique(queryParts.flatMap(searchableTokens)).slice(0, 48);
  const keywordFallbackTerms = unique([
    ...productFamilies,
    ...interfaces,
    ...memory,
    ...performance,
    ...DEFAULT_KEYWORD_FALLBACK_TERMS,
  ]).slice(0, 24);
  const query = unique([
    ...identifiers,
    ...productFamilies,
    ...performance,
    ...memory,
    ...interfaces,
    ...securityNotes,
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
    currentProductText,
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

function capabilityPolarity(text: string, pattern: RegExp) {
  const segments = text
    .split(/(?:\r?\n)+|(?<=[.!?])\s+/)
    .filter((segment) => pattern.test(segment));
  if (!segments.length) return 'unknown' as const;
  const absent = segments.some((segment) =>
    /\b(?:no|without|disabled|unpopulated|not included|not available|excludes?)\b/i.test(segment),
  );
  const present = segments.some((segment) =>
    !/\b(?:no|without|disabled|unpopulated|not included|not available|excludes?)\b/i.test(segment),
  );
  return absent && present ? 'ambiguous' as const : absent ? 'absent' as const : 'present' as const;
}

function recordRole(row: LexicalChunkRow): HistoryDocumentRole {
  const text = `${row.fileName}\n${row.title}\n${row.content}`.toLowerCase();
  const heading = `${row.fileName}\n${row.title}`.toLowerCase();
  const structuredContainer = /\.(?:csv|json)$/i.test(row.fileName)
    || /^\s*(?:record[ _-]?id|product(?:[ _-]?name)?)\s*:/im.test(row.content) && /\b(?:prior[_ -]?eccn|review[_ -]?status|classification[_ -]?basis)\s*:/i.test(row.content);
  if (/\breadme\b/.test(text)) return 'dataset_readme';
  // Ingestion record type is authoritative. A prior memo may say that human
  // review is required without becoming an internal policy document.
  if (row.recordType === 'prior_memo' || row.recordType === 'approval_record') return 'classification_memo';
  if (row.recordType === 'review_note') return 'review_worksheet';
  if (row.recordType === 'datasheet' || row.recordType === 'technical_spec' || row.recordType === 'catalog' || row.recordType === 'spreadsheet') return 'product_precedent';
  if (row.recordType === 'regulatory_material') return 'regulatory_material';
  if (row.recordType === 'technical_source') return 'technical_source';
  // Legacy uploads were persisted as `other`; deterministic container/document
  // structure is stronger than disclaimer prose for those records.
  if (structuredContainer) return 'product_precedent';
  if (/\b(?:internal )?classification memo\b/.test(heading)) return 'classification_memo';
  if (/\b(?:classification review worksheet|review worksheet)\b/.test(heading)) return 'review_worksheet';
  if (/\b(?:data ?sheet|technical (?:source|spec(?:ification)?))\b/.test(heading)) return 'technical_source';
  // A generic disclaimer is not a semantic role. Counsel and policy documents
  // need positive structural evidence, so a product memo mentioning counsel or
  // human review cannot be silently re-routed.
  if (/\b(?:counsel review summary|outside counsel (?:memorandum|memo)|legal opinion|legal guidance|counsel findings|attorney review conclusions)\b/.test(heading)
    || /\b(?:purpose|summary)\s*:\s*(?:legal|counsel)\s+(?:guidance|advice|review)\b/.test(text)) return 'counsel_guidance';
  if (/\b(?:internal (?:export )?policy|policy excerpt|review policy|company[- ]wide (?:policy|procedure))\b/.test(heading)
    || /\b(?:policy|procedure)\s*:\s*.+\b(?:must|shall|required)\b/i.test(text)) return 'internal_policy';
  if (/\b(?:administrative|upload instructions|index manifest)\b/.test(text)) return 'administrative';
  return 'unclassified';
}

function scoreCompanyHistoryResult(input: {
  row: LexicalChunkRow;
  identifiers: string[];
  productFamilies: string[];
  technicalFacts: string[];
  eccns: string[];
  technicalConcepts: TechnicalConcept[];
  currentProductText: string;
}) {
  const haystack = `${input.row.title}\n${input.row.fileName}\n${input.row.content}\n${normalizedMetadataStrings(input.row.metadata).join('\n')}`.toLowerCase();
  const reasons: string[] = [];
  let boost = 0;
  let contradictionPenalty = 0;
  const materialDifferences: string[] = [];
  const blockingContradictions: string[] = [];
  const currentNetworking = /\b(?:smartnic|network interface|network adapter|ethernet|router|switch|traffic offload)\b/i.test(input.currentProductText);
  const historyNetworking = /\b(?:smartnic|network interface|network adapter|ethernet|router|switch|traffic offload)\b/i.test(haystack);
  const currentAccelerator = /\b(?:ai accelerator|accelerator card|inference|training|hbm|tops|tflops)\b/i.test(input.currentProductText);
  const historyAccelerator = /\b(?:ai accelerator|accelerator card|inference|training|hbm|tops|tflops)\b/i.test(haystack);
  if ((currentNetworking && historyAccelerator) || (currentAccelerator && historyNetworking)) {
    contradictionPenalty += 10;
    materialDifferences.push('Different complete-product form and primary function.');
  }

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

  const conceptMatches = input.technicalConcepts.filter((concept) =>
    capabilityPolarity(input.currentProductText, concept.currentPattern) === 'present' &&
    capabilityPolarity(haystack, concept.historyPattern) === 'present',
  );
  if (conceptMatches.length) {
    boost += Math.min(3.5, conceptMatches.length * 0.65);
    reasons.push(`Shared product characteristics: ${conceptMatches.slice(0, 5).map((concept) => concept.label).join('; ')}`);
  }

  for (const concept of TECHNICAL_CONCEPTS) {
    const currentPolarity = capabilityPolarity(input.currentProductText, concept.currentPattern);
    const historyPolarity = capabilityPolarity(haystack, concept.historyPattern);
    if (currentPolarity === 'absent' && historyPolarity === 'present') {
      contradictionPenalty += 12;
      blockingContradictions.push(
        `${concept.label} is explicitly absent in the current source but present in history.`,
      );
    } else if (
      currentPolarity !== 'unknown' &&
      historyPolarity !== 'unknown' &&
      currentPolarity !== historyPolarity
    ) {
      contradictionPenalty += 4;
      materialDifferences.push(`${concept.label} has different evidence polarity.`);
    }
  }

  const matchTier = exactIdentifiers.length
    ? 'direct'
    : factMatches.length >= 2 || familyMatches.length
      ? 'partial'
      : 'weak';

  const role = recordRole(input.row);
  const productRole = ['product_precedent', 'classification_memo', 'review_worksheet', 'technical_source'].includes(role);
  const recommendedUse = !productRole
    ? role === 'dataset_readme' || role === 'administrative' ? 'irrelevant' : 'context'
      : blockingContradictions.length || contradictionPenalty >= 10
      ? 'contrast'
      : matchTier === 'direct'
        ? 'precedent'
        : matchTier === 'partial' || conceptMatches.length > 0
          ? 'partial_precedent'
          : 'irrelevant';
  return {
    score: input.row.baseScore + boost - contradictionPenalty,
    matchTier: blockingContradictions.length ? 'weak' : matchTier,
    matchReasons: reasons,
    supportingMatches: reasons,
    materialDifferences,
    blockingContradictions,
    similarityComponents: {
      lexical: input.row.baseScore,
      positiveBoost: boost,
      contradictionPenalty: -contradictionPenalty,
    },
    recommendedUse,
    recordRole: role,
    agreements: reasons,
    configurationDifferences: materialDifferences.filter((item) => /configuration/i.test(item)),
  } as const;
}

function asMatch(result: ReturnType<typeof scoreCompanyHistoryResult> & { row: LexicalChunkRow }, rank: number, retrievalMethod: string): RetrievedCompanyHistoryMatch {
  const isSpreadsheetRow = result.row.recordType === 'spreadsheet' || /\.csv$/i.test(result.row.fileName);
  const recordId = result.row.content.match(/^(?:record[ _-]?id|id|case[ _-]?id)\s*:\s*([^\n]+)/im)?.[1]?.trim();
  return {
    companyHistoryDocumentId: result.row.historyDocumentId,
    companyHistoryChunkId: result.row.chunkId,
    sourceFileName: result.row.fileName,
    sourceTitle: result.row.title,
    recordLocator: isSpreadsheetRow ? `CSV row ${result.row.chunkOrdinal + 2}` : `record ${result.row.chunkOrdinal + 1}`,
    recordLocatorMetadata: isSpreadsheetRow
      ? { kind: 'csv_row', rowNumber: result.row.chunkOrdinal + 2, recordId, chunkOrdinal: result.row.chunkOrdinal }
      : { kind: 'document_chunk', chunkOrdinal: result.row.chunkOrdinal },
    importedAt: result.row.importedAt,
    excerpt: result.row.content,
    rank,
    score: result.score,
    matchTier: result.matchTier,
    matchReasons: result.matchReasons,
    retrievalMethod,
    retrievalVersion: RETRIEVAL_VERSION,
    supportingMatches: result.supportingMatches,
    materialDifferences: result.materialDifferences,
    blockingContradictions: result.blockingContradictions,
    similarityComponents: result.similarityComponents,
    recommendedUse: result.recommendedUse,
    recordRole: result.recordRole,
    agreements: result.agreements,
    configurationDifferences: result.configurationDifferences,
  };
}

/** Allocate independent role pools before a product-precedent top-K is applied. */
function allocateRolePools(
  ranked: Array<ReturnType<typeof scoreCompanyHistoryResult> & { row: LexicalChunkRow }>,
  topK: number,
  retrievalMethod: string,
): CanonicalHistoryPools {
  const matches = ranked.map((result, index) => asMatch(result, index + 1, retrievalMethod));
  const productEligible = matches.filter((match) =>
    ['product_precedent', 'classification_memo', 'review_worksheet'].includes(match.recordRole)
    && ['precedent', 'partial_precedent', 'contrast'].includes(match.recommendedUse),
  );
  const technicalEligible = matches.filter((match) =>
    match.recordRole === 'technical_source' && match.recommendedUse !== 'irrelevant',
  );
  return {
    productPrecedents: productEligible.slice(0, topK),
    technicalComparisons: technicalEligible.slice(0, topK),
    counselGuidance: matches.filter((match) => match.recordRole === 'counsel_guidance').slice(0, topK),
    internalPolicy: matches.filter((match) => match.recordRole === 'internal_policy').slice(0, topK),
    regulatoryContext: matches.filter((match) => match.recordRole === 'regulatory_material').slice(0, topK),
    excludedAdministrative: matches.filter((match) =>
      ['dataset_readme', 'administrative', 'unclassified'].includes(match.recordRole) || match.recommendedUse === 'irrelevant',
    ),
  };
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
      chunk."ordinal" AS "chunkOrdinal",
      history."id" AS "historyDocumentId",
      chunk."content" AS "content",
      ts_rank_cd(to_tsvector('simple', chunk."content"), websearch_to_tsquery('simple', ${input.ftsQuery}))::float8 AS "baseScore",
      document."fileName" AS "fileName",
      document."title" AS "title",
      history."createdAt" AS "importedAt",
      history."metadata" AS "metadata"
      ,history."recordType"::text AS "recordType"
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
      chunk."ordinal" AS "chunkOrdinal",
      history."id" AS "historyDocumentId",
      chunk."content" AS "content",
      0::float8 AS "baseScore",
      document."fileName" AS "fileName",
      document."title" AS "title",
      history."createdAt" AS "importedAt",
      history."metadata" AS "metadata"
      ,history."recordType"::text AS "recordType"
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
  historyRecordHints?: string[];
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
    historyRecordHints: input.historyRecordHints,
  });
  const topK = input.limit ?? DEFAULT_TOP_K;
  const candidateChunksBeforeFiltering = await prisma.companyHistoryChunk.count({
    where: { organizationId: input.organizationId },
  });

  if (!signals.queryTerms.length) {
    return {
      matches: [],
      pools: { productPrecedents: [], technicalComparisons: [], counselGuidance: [], internalPolicy: [], regulatoryContext: [], excludedAdministrative: [] },
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
  const pools = allocateRolePools(ranked, topK, retrievalMethod);
  const matches = [
    ...pools.productPrecedents,
    ...pools.technicalComparisons,
    ...pools.counselGuidance,
    ...pools.internalPolicy,
    ...pools.regulatoryContext,
  ];

  return {
    matches,
    pools,
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
  historyRecordHints?: string[];
  limit?: number;
}): Promise<RetrievedCompanyHistoryMatch[]> {
  return (await retrieveCompanyHistoryWithTrace(input)).matches;
}

export function appendCompanyHistoryComparison(
  memoMarkdown: string,
  pools: Pick<CanonicalHistoryPools, 'productPrecedents' | 'technicalComparisons' | 'counselGuidance' | 'internalPolicy'>,
) {
  const header = '## Company History Comparison';
  const beforeExisting = memoMarkdown.split(`\n${header}`)[0]?.trimEnd() ?? memoMarkdown.trimEnd();
  const precedentMatches = pools.productPrecedents.filter((match) => match.recommendedUse !== 'contrast');
  const contrastMatches = [
    ...pools.productPrecedents.filter((match) => match.recommendedUse === 'contrast'),
    ...pools.technicalComparisons.filter((match) => match.recommendedUse === 'contrast'),
  ];
  const policyMatches = pools.internalPolicy;
  const counselMatches = pools.counselGuidance;
  const renderMatch = (match: RetrievedCompanyHistoryMatch) => [
    `- **${match.recommendedUse === 'precedent' ? 'Similar company history found' : match.recommendedUse === 'partial_precedent' ? 'Partially similar company history found' : match.recommendedUse === 'contrast' ? 'Contrast record — material differences' : 'Context record'} — ${match.sourceFileName}**`,
    `  - Agreements: ${match.agreements.join('; ') || 'none'}`,
    ...(match.materialDifferences.length ? [`  - Material differences: ${match.materialDifferences.join('; ')}`] : []),
    ...(match.blockingContradictions.length ? [`  - Blocking contradictions: ${match.blockingContradictions.join('; ')}`] : []),
    ...(match.recordLocator ? [`  - Locator: ${match.recordLocator}`] : []),
    `  - Source excerpt: “${match.excerpt.replace(/\s+/g, ' ').slice(0, 900)}”`,
  ];
  const section = precedentMatches.length || contrastMatches.length || policyMatches.length || counselMatches.length
    ? [
        header,
        ...(precedentMatches.length ? ['### Product precedents', ...precedentMatches.flatMap(renderMatch)] : []),
        ...(contrastMatches.length ? ['### Contrast records', ...contrastMatches.flatMap(renderMatch)] : []),
        ...(counselMatches.length ? ['### Relevant counsel guidance', ...counselMatches.flatMap(renderMatch)] : []),
        ...(policyMatches.length ? ['### Relevant internal policy', ...policyMatches.flatMap(renderMatch)] : []),
        '- Internal precedent only — not regulatory authority. Reviewer confirmation remains required.',
      ].join('\n')
    : [
        header,
        '- No comparable prior company history found in this organization’s indexed internal reference material.',
        '- Internal company history is optional reviewer context and not regulatory authority.',
      ].join('\n');

  return `${beforeExisting}\n\n${section}\n`;
}
