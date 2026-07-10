import type {
  ClassificationRunStatus,
  HumanReview,
} from '@substrata/db';

const SPECIFIC_ECCN_PATTERN = /^[0-9][A-Z][0-9]{3}(?:\.[A-Za-z0-9]+|[A-Za-z0-9]*)$/;

export type CapabilitySignalRecord = {
  key: string;
  detected: boolean;
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  supportingFactIds: string[];
  supportingCitationIds: string[];
};

export type ValidationIssueRecord = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path: string;
  supportingFactIds: string[];
  supportingCitationIds: string[];
};

type WorkerCapabilitySignal = {
  key: string;
  detected: boolean;
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  supportingFactNames: string[];
  supportingCitationLabels: string[];
};

type WorkerValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path: string;
  supportingFactNames: string[];
  supportingCitationLabels: string[];
};

export function isValidSpecificEccn(value: string) {
  return SPECIFIC_ECCN_PATTERN.test(value.trim());
}

export function deriveProcessingLabel(status: ClassificationRunStatus) {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'needs_attention':
      return 'Needs attention';
    case 'blocked':
      return 'Blocked';
    case 'running':
      return 'Processing';
    case 'unknown':
      return 'Unknown';
    case 'queued':
      return 'Queued';
    case 'failed':
      return 'Failed';
    case 'pending':
    default:
      return 'Uploaded';
  }
}

export function isValidClassificationStatusTransition(
  from: ClassificationRunStatus,
  to: ClassificationRunStatus,
) {
  const transitions: Record<ClassificationRunStatus, ClassificationRunStatus[]> = {
    pending: ['queued', 'failed', 'blocked'],
    queued: ['running', 'unknown', 'failed', 'blocked'],
    running: ['completed', 'needs_attention', 'unknown', 'failed', 'blocked'],
    unknown: ['running', 'completed', 'needs_attention', 'failed', 'blocked'],
    completed: [],
    failed: [],
    needs_attention: ['running', 'blocked'],
    blocked: ['running'],
  };
  return transitions[from].includes(to);
}

export function deriveReviewStatus(
  latestReview: Pick<HumanReview, 'status' | 'workflowState' | 'claimedAt' | 'reviewedAt'> | null,
  requiresHumanReview: boolean,
) {
  if (!requiresHumanReview) {
    return {
      code: 'not_requested',
      label: 'No expert review requested',
      detail: 'No additional reviewer sign-off has been requested for this run.',
    };
  }

  if (!latestReview || latestReview.status === 'pending_review') {
    if (latestReview?.claimedAt || latestReview?.workflowState === 'in_technical_review') {
      return {
        code: 'under_review',
        label: 'Under qualified reviewer review',
        detail: 'Under qualified reviewer review',
      };
    }
    return {
      code: 'review_required',
      label: 'Expert review required before classification sign-off',
      detail: 'Expert review required before classification sign-off',
    };
  }

  switch (latestReview.status) {
    case 'approved':
      return {
        code: 'approved',
        label: 'Reviewer sign-off recorded',
        detail: 'Reviewer sign-off recorded',
      };
    case 'reviewed':
      return {
        code: 'reviewed',
        label: 'Reviewer conclusion recorded',
        detail: 'Reviewer conclusion recorded',
      };
    case 'rejected':
      return {
        code: 'rejected',
        label: 'Reviewer rejected current draft',
        detail: 'Reviewer rejected current draft',
      };
    case 'needs_more_information':
      return {
        code: 'review_required',
        label: 'Additional evidence requested by reviewer',
        detail: 'Additional evidence requested by reviewer',
      };
    default:
      return {
        code: 'review_required',
        label: 'Expert review required before classification sign-off',
        detail: 'Expert review required before classification sign-off',
      };
  }
}

export function normalizeCapabilitySignals(input: {
  workerSignals: WorkerCapabilitySignal[];
  workerValidationIssues: WorkerValidationIssue[];
  facts: Array<{ id: string; name: string }>;
  citations: Array<{ id: string; label: string }>;
}) {
  const factIdByName = new Map<string, string[]>();
  for (const fact of input.facts) {
    const matches = factIdByName.get(fact.name) ?? [];
    matches.push(fact.id);
    factIdByName.set(fact.name, matches);
  }

  const citationIdsByLabel = new Map<string, string[]>();
  for (const citation of input.citations) {
    const matches = citationIdsByLabel.get(citation.label) ?? [];
    matches.push(citation.id);
    citationIdsByLabel.set(citation.label, matches);
  }

  const capabilitySignals: CapabilitySignalRecord[] = input.workerSignals.map((signal) => ({
    key: signal.key,
    detected: signal.detected,
    confidence: signal.confidence,
    summary: signal.summary,
    supportingFactIds: signal.supportingFactNames.flatMap((name) => factIdByName.get(name) ?? []),
    supportingCitationIds: signal.supportingCitationLabels.flatMap(
      (label) => citationIdsByLabel.get(label) ?? [],
    ),
  }));

  const validationIssues: ValidationIssueRecord[] = input.workerValidationIssues.map((issue) => ({
    code: issue.code,
    severity: issue.severity,
    message: issue.message,
    path: issue.path,
    supportingFactIds: issue.supportingFactNames.flatMap((name) => factIdByName.get(name) ?? []),
    supportingCitationIds: issue.supportingCitationLabels.flatMap(
      (label) => citationIdsByLabel.get(label) ?? [],
    ),
  }));

  return { capabilitySignals, validationIssues };
}

const capabilityRules = [
  {
    key: 'hasCryptography',
    names: ['cryptographic_algorithm', 'caam', 'pkha', 'symmetric_engine', 'cryptographic_hash_engine', 'rng4', 'secure_key_management', 'inline_encryption_engine', 'otfad', 'puf'],
    tokens: ['crypto', 'cryptograph', 'aes', 'rsa', 'sha', 'ecc', 'hsm', 'tpm', 'puf'],
    summary: 'Cryptographic or security functionality was identified in the reviewed source material.',
  },
  {
    key: 'hasEncryption',
    names: ['cryptographic_algorithm', 'inline_encryption_engine', 'encrypted_boot', 'otfad'],
    tokens: ['encrypt', 'aes', 'gcm', 'cbc', 'ctr'],
    summary: 'Encryption-related functionality was identified in the reviewed source material.',
  },
  {
    key: 'hasDecryption',
    names: ['otfad', 'encrypted_boot', 'inline_encryption_engine'],
    tokens: ['decrypt', 'decryption', 'counter-mode'],
    summary: 'Decryption-related functionality was identified in the reviewed source material.',
  },
  {
    key: 'hasKeyManagement',
    names: ['secure_key_management', 'key_storage', 'zero_master_key', 'snvs'],
    tokens: ['key management', 'key derivation', 'key wrapping', 'key storage', 'secure key'],
    summary: 'Key-management functionality was identified in the reviewed source material.',
  },
  {
    key: 'hasCryptographicAccelerator',
    names: ['caam', 'pkha', 'symmetric_engine', 'cryptographic_hash_engine', 'inline_encryption_engine'],
    tokens: ['accelerator', 'engine', 'caam', 'pkha'],
    summary: 'Hardware cryptographic acceleration was identified in the reviewed source material.',
  },
  {
    key: 'hasSecureBoot',
    names: ['secure_boot', 'encrypted_boot'],
    tokens: ['secure boot', 'encrypted boot'],
    summary: 'Secure-boot functionality was identified in the reviewed source material.',
  },
  {
    key: 'hasTrustedExecution',
    names: ['security_feature'],
    tokens: ['trusted execution', 'trusted enclave', 'tee', 'secure enclave'],
    summary: 'Trusted-execution or isolated security-execution functionality was identified in the reviewed source material.',
  },
  {
    key: 'hasSecureKeyStorage',
    names: ['key_storage', 'secure_key_management', 'snvs', 'zero_master_key'],
    tokens: ['secure key storage', 'hardware-only key', 'snvs', 'zero master key'],
    summary: 'Secure key-storage behavior was identified in the reviewed source material.',
  },
  {
    key: 'hasHardwareSecurityModule',
    names: ['security_feature', 'secure_element'],
    tokens: ['hsm', 'hardware security module', 'secure element', 'tpm'],
    summary: 'Hardware security module or secure-element functionality was identified in the reviewed source material.',
  },
  {
    key: 'hasAuthenticationSecurityFeatures',
    names: ['secure_boot', 'security_feature', 'certificate_signature'],
    tokens: ['authentication', 'signature', 'certificate', 'attestation', 'secure debug'],
    summary: 'Authentication or security-attestation functionality was identified in the reviewed source material.',
  },
  {
    key: 'hasHighSpeedInterfaces',
    names: ['pcie_interface', 'displayport_interface', 'displayport_lane_rate', 'jesd_interface', 'serial_lane_rate', 'ethernet_mac'],
    tokens: ['pcie', 'displayport', 'jesd', 'gbps', 'ethernet'],
    summary: 'High-speed interface capabilities were identified in the reviewed source material.',
  },
  {
    key: 'hasProgrammableLogic',
    names: ['programmable_logic', 'ps_pl_integration'],
    tokens: ['programmable logic', 'fpga', 'pl fabric'],
    summary: 'Programmable-logic functionality was identified in the reviewed source material.',
  },
  {
    key: 'hasAdvancedProcessor',
    names: ['cpu_core', 'processor_architecture', 'realtime_cpu', 'processing_system'],
    tokens: ['cortex', 'processor', 'soc', 'mpsoc', '64-bit', 'quad-core'],
    summary: 'Advanced processor or SoC functionality was identified in the reviewed source material.',
  },
  {
    key: 'hasRFOrWirelessCapability',
    names: ['rf_frequency_range', 'frequency_range', 'rf_bandwidth', 'communications_application'],
    tokens: ['rf', 'wireless', 'transceiver', 'radar', 'radio'],
    summary: 'RF or wireless capability was identified in the reviewed source material.',
  },
] as const;

function confidenceForMatchCount(count: number): 'high' | 'medium' | 'low' {
  if (count >= 3) {
    return 'high';
  }
  if (count >= 1) {
    return 'medium';
  }
  return 'low';
}

export function deriveCapabilitySignalsFromFacts(input: {
  facts: Array<{ id: string; name: string; value: string; sourceSnippet: string }>;
}) {
  return capabilityRules.map((rule) => {
    const supportingFacts = input.facts.filter((fact) => {
      const haystack = `${fact.name} ${fact.value} ${fact.sourceSnippet}`.toLowerCase();
      return (rule.names as readonly string[]).includes(fact.name) || rule.tokens.some((token) => haystack.includes(token));
    });

    return {
      key: rule.key,
      detected: supportingFacts.length > 0,
      confidence: confidenceForMatchCount(supportingFacts.length),
      summary:
        supportingFacts.length > 0
          ? rule.summary
          : rule.summary.replace('was identified', 'was not identified'),
      supportingFactIds: supportingFacts.map((fact) => fact.id),
      supportingCitationIds: [],
    } satisfies CapabilitySignalRecord;
  });
}

export function validateNarrativeConsistency(input: {
  extractedFacts: Array<{ id: string; classificationRunId: string; name: string }>;
  capabilitySignals: CapabilitySignalRecord[];
  uncertaintyFlags: string[];
  reviewPaths: Array<{ id: string; title: string; whyTriggered: string; classificationRunId: string }>;
  eccnCandidates: Array<{
    id: string;
    eccn: string;
    whyItMayApply: string;
    whyItMayNotApply: string;
    classificationRunId: string;
  }>;
  memoSections: Array<{ key: string; content: string }>;
  citations: Array<{ id: string; sourceTitle: string; classificationRunId: string }>;
}): ValidationIssueRecord[] {
  const issues: ValidationIssueRecord[] = [];
  const textBlob = [
    ...input.reviewPaths.map((path) => path.title),
    ...input.reviewPaths.map((path) => path.whyTriggered),
    ...input.eccnCandidates.map((candidate) => candidate.whyItMayApply),
    ...input.eccnCandidates.map((candidate) => candidate.whyItMayNotApply),
    ...input.memoSections.map((section) => section.content),
  ]
    .join('\n')
    .toLowerCase();

  const signalByKey = new Map(input.capabilitySignals.map((signal) => [signal.key, signal]));
  const cryptographySignal = signalByKey.get('hasCryptography');
  const secureBootSignal = signalByKey.get('hasSecureBoot');
  const cryptoAcceleratorSignal = signalByKey.get('hasCryptographicAccelerator');

  for (const candidate of input.eccnCandidates) {
    if (!isValidSpecificEccn(candidate.eccn)) {
      issues.push({
        code: 'INVALID_ECCN_CANDIDATE',
        severity: 'error',
        message: `${candidate.eccn} is not a valid ECCN-formatted candidate.`,
        path: `eccnCandidates.${candidate.id}`,
        supportingFactIds: [],
        supportingCitationIds: [],
      });
    }
  }

  if (cryptographySignal?.detected) {
    for (const phrase of [
      'no cryptographic features were identified',
      'security functionality was not found',
      'no encryption capability was detected',
      'cryptographic functionality was not identified',
    ]) {
      if (textBlob.includes(phrase)) {
        issues.push({
          code: 'CRYPTO_NARRATIVE_CONTRADICTION',
          severity: 'error',
          message: 'Cryptographic functionality was detected, but downstream narrative denies it.',
          path: 'memo',
          supportingFactIds: cryptographySignal.supportingFactIds,
          supportingCitationIds: cryptographySignal.supportingCitationIds,
        });
        break;
      }
    }
  }

  if (secureBootSignal?.detected && textBlob.includes('security functionality was not found')) {
    issues.push({
      code: 'SECURE_BOOT_NARRATIVE_CONTRADICTION',
      severity: 'error',
      message: 'Secure-boot evidence is present, but the narrative states that security functionality was not found.',
      path: 'memo',
      supportingFactIds: secureBootSignal.supportingFactIds,
      supportingCitationIds: secureBootSignal.supportingCitationIds,
    });
  }

  if (cryptoAcceleratorSignal?.detected) {
    const hasCryptoReviewPath = input.reviewPaths.some(
      (path) =>
        path.title.toLowerCase().includes('category 5 part 2') ||
        path.title.toLowerCase().includes('cryptograph'),
    );
    const hasCryptoUncertainty = input.uncertaintyFlags.includes(
      'crypto_relevance_requires_qualified_review',
    );
    if (!hasCryptoReviewPath && !hasCryptoUncertainty) {
      issues.push({
        code: 'CRYPTO_REVIEW_PATH_MISSING',
        severity: 'error',
        message:
          'Cryptographic acceleration was detected without a corresponding cryptography review path or uncertainty flag.',
        path: 'reviewPaths',
        supportingFactIds: cryptoAcceleratorSignal.supportingFactIds,
        supportingCitationIds: cryptoAcceleratorSignal.supportingCitationIds,
      });
    }
  }

  const hasMandatoryReviewLanguage =
    textBlob.includes('qualified reviewer') ||
    textBlob.includes('expert review required') ||
    textBlob.includes('classification sign-off');
  if ((input.uncertaintyFlags.length > 0 || input.eccnCandidates.length > 0) && !hasMandatoryReviewLanguage) {
    issues.push({
      code: 'HUMAN_REVIEW_LANGUAGE_MISSING',
      severity: 'error',
      message:
        'Mandatory qualified-review language is missing from the stored memo or narrative.',
      path: 'memo',
      supportingFactIds: [],
      supportingCitationIds: [],
    });
  }

  const runId = input.extractedFacts[0]?.classificationRunId;
  if (runId) {
    const foreignFact = input.extractedFacts.find((fact) => fact.classificationRunId !== runId);
    if (foreignFact) {
      issues.push({
        code: 'FOREIGN_FACT_REFERENCE',
        severity: 'error',
        message: 'A cited fact does not belong to the same classification run.',
        path: 'facts',
        supportingFactIds: [foreignFact.id],
        supportingCitationIds: [],
      });
    }
    const foreignCitation = input.citations.find((citation) => citation.classificationRunId !== runId);
    if (foreignCitation) {
      issues.push({
        code: 'FOREIGN_CITATION_REFERENCE',
        severity: 'error',
        message: 'A citation does not belong to the same classification run.',
        path: 'citations',
        supportingFactIds: [],
        supportingCitationIds: [foreignCitation.id],
      });
    }
  }

  return issues;
}

export function summarizeValidationIssues(issues: ValidationIssueRecord[]) {
  return issues.map((issue) => `${issue.code}: ${issue.message}`).join(' | ');
}
