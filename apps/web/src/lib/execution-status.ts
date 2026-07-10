import type { ClassificationRunRecord } from './types';

export type ExecutionNotice = {
  tone: 'warning' | 'error' | 'success';
  title: string;
  body: string;
};

export function getExecutionNotice(
  run: ClassificationRunRecord,
): ExecutionNotice {
  const summary = run.executionSummary;
  const backendCompleted =
    summary?.backendCompleted ??
    (run.executionProvenance?.status === 'completed' ||
      run.status === 'completed');
  const backendOutputValidated =
    summary?.backendOutputValidated ?? Boolean(run.reviewMemo?.contentMarkdown);
  const memoValidated =
    summary?.memoValidated ?? Boolean(run.reviewMemo?.contentMarkdown);
  const fallbackUsed = summary?.fallbackUsed ?? run.fallbackUsed === true;

  if (
    !backendCompleted ||
    !backendOutputValidated ||
    !memoValidated ||
    run.status === 'failed' ||
    run.status === 'partial'
  ) {
    return {
      tone: 'error',
      title: 'Backend verification incomplete',
      body: 'Substrata could not verify this as a completed backend-assisted run. Re-run the analysis or review the draft manually.',
    };
  }

  if (fallbackUsed) {
    return {
      tone: 'warning',
      title: 'Fallback analysis used',
      body: 'The primary backend was unavailable or returned invalid output, so Substrata completed this draft using fallback reasoning. Review carefully before relying on the workup.',
    };
  }

  if (
    summary?.evidenceChecksUnresolved ??
    Boolean(
      run.validationIssues?.length ||
      run.factIssues.length ||
      run.uncertaintyFlags.length,
    )
  ) {
    return {
      tone: 'warning',
      title: 'Expert review required',
      body: 'This draft was generated successfully, but unresolved evidence checks remain. A qualified reviewer should confirm missing technical details, current CCL threshold mapping, and final classification before sign-off.',
    };
  }

  return {
    tone: 'success',
    title: 'Draft ready for review',
    body: 'Substrata completed the backend-assisted draft. A qualified reviewer should confirm the final classification before sign-off.',
  };
}
