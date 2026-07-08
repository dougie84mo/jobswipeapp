// AtsAdapter — the single interface every ATS connector implements.
//
// Adding a new provider means writing one adapter file under
// src/ats/adapters/<provider>/ and registering it in src/ats/registry.ts.
// Nothing else in the app should branch on `providerId` — UI branches on
// capabilities() instead.

export type ProviderId =
  // Applicant Tracking Systems
  | 'greenhouse'
  | 'lever'
  | 'workable'
  | 'ashby'
  | 'smartrecruiters'
  | 'workday'
  | 'bamboohr'
  | 'jazzhr'
  | 'recruitee'
  | 'teamtailor'
  | 'icims'
  | 'manatal'
  | 'mock'
  // Job boards
  | 'indeed'
  | 'ziprecruiter';

export type AuthType = 'oauth2' | 'api_key' | 'basic';

// What kind of recruiting surface a provider exposes. Drives UI grouping on
// the Connect and Connections screens, and may influence which swipe actions
// are meaningful (job boards generally don't have a pipeline to advance
// through; they have applicants to save to your ATS).
export type SourceKind = 'ats' | 'job_board';

export const PROVIDER_KIND: Record<ProviderId, SourceKind> = {
  mock: 'ats',
  greenhouse: 'ats',
  lever: 'ats',
  workable: 'ats',
  ashby: 'ats',
  smartrecruiters: 'ats',
  workday: 'ats',
  bamboohr: 'ats',
  jazzhr: 'ats',
  recruitee: 'ats',
  teamtailor: 'ats',
  icims: 'ats',
  manatal: 'ats',
  indeed: 'job_board',
  ziprecruiter: 'job_board',
};

export function sourceKindFor(provider: ProviderId): SourceKind {
  return PROVIDER_KIND[provider];
}

export interface AuthContext {
  userId: string;
  /** Redirect URI the provider should send the user back to after consent. */
  redirectUri: string;
  /** Provider-specific extras (e.g. workspace slug, region). */
  extras?: Record<string, unknown>;
}

export interface AuthBeginResult {
  /** URL the recruiter is sent to in order to grant access. */
  authorizationUrl: string;
  /** Opaque state the adapter wants threaded through `completeAuth`. */
  state?: string;
}

/**
 * The shape stored in `integrations.credentials_encrypted` after decryption.
 * Adapters pick whichever subset they need.
 */
export interface StoredCredentials {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  expiresAt?: string;
  extras?: Record<string, unknown>;
}

export interface Page<T> {
  items: T[];
  /** Pass back to the adapter to fetch the next page; null when finished. */
  nextCursor: string | null;
}

export interface Requisition {
  externalId: string;
  title: string;
  department?: string;
  location?: string;
  raw: unknown;
}

/**
 * One employment span. Dates are loose strings ("2022-01-05", "2022-01",
 * "2022") because providers disagree; render-side formats leniently and
 * deriveYearsExperience() parses what it can. `end` absent = current role.
 */
export interface ExperienceEntry {
  title?: string;
  company?: string;
  start?: string;
  end?: string;
  summary?: string;
}

export interface EducationEntry {
  school: string;
  degree?: string;
  field?: string;
  start?: string;
  end?: string;
}

export interface Candidate {
  externalId: string;
  requisitionExternalId: string;
  fullName: string;
  headline?: string;
  location?: string;
  resumeUrl?: string;
  photoUrl?: string;
  skills?: string[];
  yearsExperience?: number;
  /** Employment history, most-recent first. Sparse for most providers. */
  experience?: ExperienceEntry[];
  /** Education history, most-recent first. Sparse for most providers. */
  education?: EducationEntry[];
  raw: unknown;
}

export interface Stage {
  id: string;
  name: string;
  order?: number;
}

export interface Tag {
  id: string;
  name: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject?: string;
}

/**
 * What the provider can do. Drives the Settings UI: an action type is only
 * offered to the recruiter if the corresponding capability is true.
 */
export interface AtsCapabilities {
  canAdvanceStage: boolean;
  canReject: boolean;
  canApplyTag: boolean;
  canSendMessage: boolean;
  canAddNote: boolean;
  canSendTemplate: boolean;
}

// requisitionExternalId is on every write input because some providers (e.g.
// Greenhouse) can't disambiguate which application of a multi-job candidate
// to act on without it. Providers that don't need it ignore the field.

export interface AdvanceStageInput {
  candidateExternalId: string;
  requisitionExternalId: string;
  stageId: string;
}

export interface RejectInput {
  candidateExternalId: string;
  requisitionExternalId: string;
  reasonId?: string;
}

export interface AddTagInput {
  candidateExternalId: string;
  requisitionExternalId: string;
  tagId: string;
}

export interface SendMessageInput {
  candidateExternalId: string;
  requisitionExternalId: string;
  templateId?: string;
  body?: string;
  subject?: string;
}

export interface AddNoteInput {
  candidateExternalId: string;
  requisitionExternalId: string;
  text: string;
}

export interface AtsAdapter {
  readonly providerId: ProviderId;
  readonly displayName: string;
  readonly authType: AuthType;

  // Connection lifecycle
  beginAuth(ctx: AuthContext): Promise<AuthBeginResult>;
  completeAuth(ctx: AuthContext, payload: unknown): Promise<StoredCredentials>;
  testConnection(creds: StoredCredentials): Promise<boolean>;

  // Reads (paginated, normalized to internal shapes)
  listRequisitions(creds: StoredCredentials, cursor?: string): Promise<Page<Requisition>>;
  listCandidatesForRequisition(
    creds: StoredCredentials,
    requisitionExternalId: string,
    cursor?: string,
  ): Promise<Page<Candidate>>;
  getCandidate(creds: StoredCredentials, candidateExternalId: string): Promise<Candidate>;

  // Capabilities — drive which swipe actions the UI offers per provider
  capabilities(): AtsCapabilities;
  listStages(creds: StoredCredentials, requisitionExternalId: string): Promise<Stage[]>;
  listTags(creds: StoredCredentials): Promise<Tag[]>;
  listEmailTemplates?(creds: StoredCredentials): Promise<EmailTemplate[]>;

  // Writes — adapter omits methods the provider doesn't support
  advanceCandidateStage?(creds: StoredCredentials, input: AdvanceStageInput): Promise<void>;
  rejectCandidate?(creds: StoredCredentials, input: RejectInput): Promise<void>;
  addCandidateTag?(creds: StoredCredentials, input: AddTagInput): Promise<void>;
  sendCandidateMessage?(creds: StoredCredentials, input: SendMessageInput): Promise<void>;
  addCandidateNote?(creds: StoredCredentials, input: AddNoteInput): Promise<void>;
}

// ============================================================================
// Configurable swipe actions (stored in integration_settings.actions)
// ============================================================================

export type SwipeDirection = 'right' | 'left' | 'up';

export type ActionDescriptor =
  | { type: 'advance_stage'; stage_id: string }
  | { type: 'apply_tag'; tag_id: string }
  | { type: 'send_template'; template_id: string }
  | { type: 'reject'; reason_id?: string }
  | { type: 'add_note'; text: string }
  | { type: 'local_only' };

export interface ExecutedAction {
  descriptor: ActionDescriptor;
  status: 'success' | 'failure' | 'skipped';
  message?: string;
  executedAt: string;
}
