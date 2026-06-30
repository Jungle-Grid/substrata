import { prisma } from '@substrata/db';
import {
  deriveCapabilitySignalsFromFacts,
  isValidSpecificEccn,
  summarizeValidationIssues,
  validateNarrativeConsistency,
} from '../services/classification-integrity';

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter((arg) => arg.startsWith('--')));
  const runIdArg = argv.find((arg) => arg.startsWith('--run-id='));
  return {
    dryRun: flags.has('--dry-run'),
    all: flags.has('--all'),
    runId: runIdArg?.split('=')[1] ?? null,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.all && !args.runId) {
    throw new Error('Use --all or --run-id=<id>.');
  }

  const runs = await prisma.classificationRun.findMany({
    where: args.runId ? { id: args.runId } : undefined,
    include: {
      extractedSpecs: true,
      reviewPaths: {
        include: {
          citations: true,
        },
      },
      eccnCandidates: {
        include: {
          citations: true,
          factMappings: true,
        },
      },
      reviewMemo: true,
      citations: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const summary: Array<Record<string, unknown>> = [];

  for (const run of runs) {
    const invalidCandidates = run.eccnCandidates.filter(
      (candidate) => !isValidSpecificEccn(candidate.eccn),
    );
    const capabilitySignals = deriveCapabilitySignalsFromFacts({
      facts: run.extractedSpecs.map((fact) => ({
        id: fact.id,
        name: fact.name,
        value: fact.value,
        sourceSnippet: fact.sourceSnippet,
      })),
    });
    const memoSections = (run.reviewMemo?.contentMarkdown ?? '')
      .split(/\n##\s+/)
      .map((section, index) => ({
        key: index === 0 ? 'root' : section.split('\n')[0]?.trim() ?? `section_${index}`,
        content: index === 0 ? section : `## ${section}`,
      }));
    const validationIssues = validateNarrativeConsistency({
      extractedFacts: run.extractedSpecs.map((fact) => ({
        id: fact.id,
        classificationRunId: fact.classificationRunId,
        name: fact.name,
      })),
      capabilitySignals,
      uncertaintyFlags: run.uncertaintyFlags,
      reviewPaths: run.reviewPaths.map((path) => ({
        id: path.id,
        title: path.title,
        whyTriggered: path.whyTriggered,
        classificationRunId: path.classificationRunId,
      })),
      eccnCandidates: run.eccnCandidates.map((candidate) => ({
        id: candidate.id,
        eccn: candidate.eccn,
        whyItMayApply: candidate.whyItMayApply,
        whyItMayNotApply: candidate.whyItMayNotApply,
        classificationRunId: candidate.classificationRunId,
      })),
      memoSections,
      citations: run.citations.map((citation) => ({
        id: citation.id,
        sourceTitle: citation.sourceTitle,
        classificationRunId: citation.classificationRunId,
      })),
    });

    const needsAttention = validationIssues.length > 0;
    const createdReviewPaths: string[] = [];

    if (!args.dryRun) {
      await prisma.$transaction(async (tx) => {
        for (const candidate of invalidCandidates) {
          let reviewPathId = candidate.reviewPathId;
          if (!reviewPathId) {
            const createdPath = await tx.reviewPath.create({
              data: {
                organizationId: candidate.organizationId,
                classificationRunId: candidate.classificationRunId,
                type: candidate.eccn.toLowerCase().includes('5 part 2')
                  ? 'encryption_security'
                  : 'product_area',
                status: 'open',
                title: candidate.title,
                scope: `Assess whether the extracted technical evidence supports the ${candidate.title.toLowerCase()} path.`,
                whyTriggered: candidate.whyItMayApply,
                missingInformation: candidate.missingInformation,
                reviewerQuestions: candidate.reviewerQuestions,
                reviewerNotes: null,
                decisionRationale: candidate.whyItMayNotApply,
              },
            });
            reviewPathId = createdPath.id;
            createdReviewPaths.push(createdPath.id);
          }

          await tx.eCCNCandidate.update({
            where: { id: candidate.id },
            data: {
              isSpecificEccn: false,
              reviewPathId,
            },
          });

          await tx.citation.updateMany({
            where: {
              eccnCandidateId: candidate.id,
              reviewPathId: null,
            },
            data: {
              reviewPathId,
            },
          });
        }

        await tx.classificationRun.update({
          where: { id: run.id },
          data: {
            capabilitySignals: capabilitySignals,
            validationIssues: validationIssues,
            status:
              needsAttention && run.status !== 'failed'
                ? 'needs_attention'
                : run.status,
            errorMessage: needsAttention ? summarizeValidationIssues(validationIssues) : null,
          },
        });
      });
    }

    summary.push({
      runId: run.id,
      invalidCandidateCount: invalidCandidates.length,
      createdReviewPathCount: createdReviewPaths.length,
      validationIssueCount: validationIssues.length,
      requiresRegeneration: needsAttention,
      dryRun: args.dryRun,
    });
  }

  console.log(JSON.stringify({ dryRun: args.dryRun, runCount: runs.length, summary }, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
