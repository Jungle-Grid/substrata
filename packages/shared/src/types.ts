export type ClassificationStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed';

export type ReviewStatus =
  | 'pending_review'
  | 'reviewed'
  | 'needs_more_information'
  | 'in_review'
  | 'approved'
  | 'rejected';

export type UncertaintyFlag =
  | 'missing_key_specs'
  | 'ambiguous_datasheet_language'
  | 'multiple_plausible_eccns'
  | 'limited_regulatory_coverage'
  | 'requires_engineering_confirmation';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type MembershipRole = 'OWNER' | 'ADMIN' | 'REVIEWER' | 'ANALYST' | 'VIEWER';
