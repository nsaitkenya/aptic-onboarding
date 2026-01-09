
export enum EntityType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company'
}

export enum OnboardingStep {
  WELCOME = 0,
  ENTITY_SELECT = 1,
  DOC_UPLOAD = 2,
  AI_PROCESSING = 3,
  REVIEW_VALIDATION = 4,
  PASSWORD_SETUP = 5,
  COMPLETE = 6,
  ADMIN_PANEL = 7
}

export interface Director {
  name: string | null;
  id_number: string | null;
  kra_pin: string | null;
}

export interface ExtractedData {
  full_name: string | null;
  company_name: string | null;
  kra_pin: string | null;
  registration_number: string | null;
  date_of_incorporation: string | null;
  registered_address: string | null;
  directors: Director[];
}

export enum DocStatus {
  PENDING = 'PENDING',
  UPLOADED = 'UPLOADED',
  VALIDATED = 'VALIDATED',
  APPROVED = 'APPROVED'
}

export interface OnboardingDoc {
  id: string;
  type: string;
  status: DocStatus;
  content: string | null;
}

export interface ValidationSummary {
  conflicts_detected: string[];
  missing_fields: string[];
  low_confidence_fields: string[];
}

export interface ExtractionResult {
  entity_type: EntityType;
  documents_processed: string[];
  extracted_data: ExtractedData;
  validation: ValidationSummary;
  confidence_score: Record<string, number>;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

export interface UserFeedback {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  timestamp: string;
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  actor: string;
  target: string;
  status: 'info' | 'success' | 'warning' | 'error';
}

export interface CustomerRecord extends ExtractionResult {
  id: string;
  joinedAt: string;
  status: 'Provisional' | 'Verified' | 'Flagged';
  originalDocs: OnboardingDoc[];
}
