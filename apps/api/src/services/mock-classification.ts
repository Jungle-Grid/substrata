import type { WorkerOutput } from '@substrata/shared';

export function buildMockWorkerOutput(input: {
  documentId: string;
  organizationId: string;
  title: string;
  rawText?: string | null;
}): WorkerOutput {
  const text = input.rawText ?? '';
  const hasRadiation = /radiation|rad[- ]hard/i.test(text);
  const hasHighSpeed = /ghz|serdes|throughput|gops|tops/i.test(text);

  const uncertaintyFlags = [
    'multiple_plausible_eccns',
    hasRadiation ? 'requires_engineering_confirmation' : 'missing_key_specs',
  ] as const;

  return {
    documentId: input.documentId,
    organizationId: input.organizationId,
    requiresHumanReview: true,
    confidence: 0.61,
    uncertaintyFlags: [...uncertaintyFlags],
    extractedSpecs: [
      {
        name: 'process_node',
        value: '7',
        unit: 'nm',
        sourceSnippet: 'Manufactured on a 7 nm process node',
        importance:
          'Process technology can matter when a reviewer compares performance claims to controlled semiconductor thresholds.',
        category: 'converter_performance',
        confidence: 'medium',
      },
      {
        name: 'serdes_rate',
        value: hasHighSpeed ? '112' : '56',
        unit: 'Gbps',
        sourceSnippet: hasHighSpeed
          ? 'Supports 112 Gbps PAM4 SerDes lanes'
          : 'Supports 56 Gbps serial interfaces',
        importance:
          'High-speed I/O claims are often the most concrete technical facts available in a first-pass ECCN review.',
        category: 'digital_interface',
        confidence: 'medium',
      },
      {
        name: 'radiation_tolerance',
        value: hasRadiation ? 'present' : 'not stated',
        unit: null,
        sourceSnippet: hasRadiation
          ? 'Radiation-tolerant packaging is referenced in the datasheet'
          : 'No explicit radiation-hardness statement found in the sample text',
        importance:
          'Radiation-tolerance statements can materially change how a reviewer narrows plausible ECCN paths.',
        category: 'environmental_qualification',
        confidence: 'low',
      },
    ],
    eccnCandidates: [
      {
        eccn: '3A001',
        title: 'Electronics review path for high-performance components',
        confidence: hasHighSpeed ? 'medium' : 'low',
        matchedTechnicalFacts: [
          'process_node: 7 nm',
          hasHighSpeed
            ? 'serdes_rate: 112 Gbps'
            : 'serdes_rate: 56 Gbps',
          `radiation_tolerance: ${hasRadiation ? 'present' : 'not stated'}`,
        ],
        regulatoryCitations: [
          {
            citationLabel: input.title,
            citationText: hasHighSpeed
              ? 'Supports 112 Gbps PAM4 SerDes lanes'
              : 'Supports 56 Gbps serial interfaces',
            source: 'Performance summary',
            relevance:
              'Indicates that throughput and interface performance may be classification-relevant.',
          },
          {
            citationLabel: 'CCL Category 3 electronics review',
            citationText:
              'Category 3 contains electronics review paths for certain high-performance components and related interfaces.',
            source: 'Category 3',
            relevance:
              'Connects the extracted performance signals to the initial Category 3 review path.',
          },
        ],
        whyItMayApply:
          'The extracted performance signals support a closer Category 3 electronics review path.',
        whyItMayNotApply:
          'The current text does not establish a clean threshold match to a narrower control entry.',
        missingInformation: [
          'Precise architecture and control-text threshold mapping',
          'Supporting engineering clarification for any specialized deployment statements',
        ],
        uncertaintyFlags: [...uncertaintyFlags],
        reviewerQuestions: [
          'Which control-text threshold is the closest candidate fit for the extracted performance claims?',
        ],
      },
      {
        eccn: '3A991',
        title: 'General electronics comparison path',
        confidence: 'low',
        matchedTechnicalFacts: [
          'The document appears to describe a high-performance semiconductor component.',
        ],
        regulatoryCitations: [
          {
            citationLabel: 'General electronics fallback review',
            citationText:
              'A broader electronics comparison path is relevant only after narrower electronics review paths are excluded.',
            source: 'Category 3',
            relevance:
              'Used as a conservative comparison point pending fuller expert analysis.',
          },
        ],
        whyItMayApply:
          'This candidate can remain a fallback if expert review excludes narrower controlled categories.',
        whyItMayNotApply:
          'The extracted facts still suggest a reviewer should examine narrower Category 3 paths first.',
        missingInformation: [
          'Documented basis for ruling out narrower semiconductor entries',
        ],
        uncertaintyFlags: ['missing_key_specs', 'multiple_plausible_eccns'],
        reviewerQuestions: [
          'What is the affirmative basis for using a fallback ECCN here?',
        ],
      },
    ],
    memoMarkdown: `# Draft ECCN Review Memo — ${input.title}\n\n## 1. Document Summary\n- Title: ${input.title}\n- Document ID: ${input.documentId}\n- Disclaimer: Draft for expert review only. This memo is not a final legal or compliance determination.\n\n## 2. Extracted Technical Facts\n- Process node: 7 nm\n- Serial interface performance: ${hasHighSpeed ? '112 Gbps' : '56 Gbps'}\n- Radiation tolerance statement: ${hasRadiation ? 'present' : 'not stated'}\n\n## 3. Candidate ECCN Review Paths\n- 3A001 remains an evidence-based review path.\n- 3A991 remains a broader comparison path only after narrower review paths are examined.\n\n## 6. Draft Conclusion\n- This draft does not make a final ECCN determination.\n- A qualified expert should confirm the applicable threshold mapping and final ECCN.`,
    artifacts: {
      extractedTextPath: `artifacts/${input.documentId}/extracted-text.txt`,
      structuredOutputPath: `artifacts/${input.documentId}/classification-output.json`,
      memoPath: `artifacts/${input.documentId}/memo.md`,
    },
  };
}
