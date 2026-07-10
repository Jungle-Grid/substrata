import { Prisma, prisma } from '@substrata/db';

const RETRIEVAL_METHOD = 'postgres_lexical_v1';
const RETRIEVAL_VERSION = 'company_history_retrieval_v1';

type CurrentFact = {
  name: string;
  value: string;
  sourceSnippet?: string | null;
};

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

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function exactEccnStrings(text: string) {
  return unique(Array.from(text.matchAll(/\b[0-9][A-E][0-9]{3}(?:\.[A-Za-z0-9]+|[A-Za-z0-9]*)\b/g), (match) => match[0]));
}

function searchableTokens(value: string) {
  return value.match(/[A-Za-z0-9][A-Za-z0-9_.-]{2,}/g) ?? [];
}

function querySignals(input: {
  title: string;
  sourceText: string;
  extractedSpecs: CurrentFact[];
}) {
  const identifiers = unique(
    input.extractedSpecs
      .filter((spec) => ['part_number', 'product_name', 'product_family', 'manufacturer', 'model', 'sku'].includes(spec.name))
      .map((spec) => spec.value),
  );
  const technicalFacts = unique(
    input.extractedSpecs
      .filter((spec) => !['part_number', 'product_name', 'product_family', 'manufacturer', 'model', 'sku'].includes(spec.name))
      .flatMap((spec) => [spec.name.replace(/_/g, ' '), spec.value]),
  );
  const eccns = exactEccnStrings(`${input.title}\n${input.sourceText}\n${input.extractedSpecs.map((spec) => spec.value).join('\n')}`);
  const query = unique([
    ...searchableTokens(input.title),
    ...identifiers.flatMap(searchableTokens),
    ...technicalFacts.flatMap(searchableTokens),
    ...eccns,
  ]).slice(0, 36);

  return { identifiers, technicalFacts, eccns, query };
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

function scoreCompanyHistoryResult(input: {
  row: LexicalChunkRow;
  identifiers: string[];
  technicalFacts: string[];
  eccns: string[];
}) {
  const haystack = `${input.row.title}\n${input.row.fileName}\n${input.row.content}\n${normalizedMetadataStrings(input.row.metadata).join('\n')}`.toLowerCase();
  const reasons: string[] = [];
  let boost = 0;

  const exactIdentifiers = input.identifiers.filter((value) => value.length >= 3 && haystack.includes(value.toLowerCase()));
  if (exactIdentifiers.length) {
    boost += 6 + exactIdentifiers.length;
    reasons.push(`Exact product identifier match: ${exactIdentifiers.slice(0, 2).join(', ')}`);
  }

  const familyTerms = input.identifiers.filter((value) => /[a-z]/i.test(value) && value.length >= 4);
  const familyMatches = familyTerms.filter((value) => haystack.includes(value.toLowerCase()));
  if (familyMatches.length && !exactIdentifiers.length) {
    boost += 2.5;
    reasons.push(`Related product or family term: ${familyMatches.slice(0, 2).join(', ')}`);
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

export async function retrieveCompanyHistory(input: {
  organizationId: string;
  documentTitle: string;
  sourceText: string;
  extractedSpecs: CurrentFact[];
  limit?: number;
}): Promise<RetrievedCompanyHistoryMatch[]> {
  const signals = querySignals({
    title: input.documentTitle,
    sourceText: input.sourceText,
    extractedSpecs: input.extractedSpecs,
  });
  if (!signals.query.length) return [];

  const lexicalQuery = signals.query.join(' ');
  const rows = await prisma.$queryRaw<LexicalChunkRow[]>(Prisma.sql`
    SELECT
      chunk."id" AS "chunkId",
      history."id" AS "historyDocumentId",
      chunk."content" AS "content",
      ts_rank_cd(to_tsvector('simple', chunk."content"), websearch_to_tsquery('simple', ${lexicalQuery}))::float8 AS "baseScore",
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
      AND to_tsvector('simple', chunk."content") @@ websearch_to_tsquery('simple', ${lexicalQuery})
    ORDER BY "baseScore" DESC, chunk."createdAt" DESC
    LIMIT 24
  `);

  return rows
    .map((row) => ({ row, ...scoreCompanyHistoryResult({ row, ...signals }) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, input.limit ?? 3)
    .map((result, index) => ({
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
      retrievalMethod: RETRIEVAL_METHOD,
      retrievalVersion: RETRIEVAL_VERSION,
    }));
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
