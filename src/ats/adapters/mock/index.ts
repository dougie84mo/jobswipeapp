// Mock ATS adapter.
//
// Returns deterministic fake requisitions and candidates so the rest of the
// app (integrations list, requisition picker, swipe deck, swipe persistence)
// can be built and demoed end-to-end without a real ATS sandbox account.
//
// No network. No credentials beyond a placeholder so the integrations row
// satisfies the not-null credentials_encrypted column. Replace with real
// adapters in their own PRs.

import type {
  AddNoteInput,
  AddTagInput,
  AdvanceStageInput,
  AtsAdapter,
  AuthBeginResult,
  AuthContext,
  Candidate,
  EmailTemplate,
  Page,
  RejectInput,
  Requisition,
  SendMessageInput,
  Stage,
  StoredCredentials,
  Tag,
} from '../../types';

const REQUISITIONS: Requisition[] = [
  {
    externalId: 'req-eng-senior',
    title: 'Senior Software Engineer',
    department: 'Engineering',
    location: 'Remote — Americas',
    raw: { source: 'mock' },
  },
  {
    externalId: 'req-design-product',
    title: 'Product Designer',
    department: 'Design',
    location: 'New York, NY',
    raw: { source: 'mock' },
  },
  {
    externalId: 'req-gtm-lead',
    title: 'GTM Operations Lead',
    department: 'Go-to-Market',
    location: 'San Francisco, CA',
    raw: { source: 'mock' },
  },
];

const STAGES: Stage[] = [
  { id: 'stage-applied', name: 'Applied', order: 1 },
  { id: 'stage-recruiter-screen', name: 'Recruiter Screen', order: 2 },
  { id: 'stage-tech-interview', name: 'Technical Interview', order: 3 },
  { id: 'stage-onsite', name: 'Onsite', order: 4 },
  { id: 'stage-offer', name: 'Offer', order: 5 },
];

const TAGS: Tag[] = [
  { id: 'tag-shortlist', name: 'Shortlist' },
  { id: 'tag-strong-yes', name: 'Strong Yes' },
  { id: 'tag-needs-review', name: 'Needs Review' },
  { id: 'tag-referral', name: 'Referral' },
  { id: 'tag-passive', name: 'Passive Talent' },
];

const TEMPLATES: EmailTemplate[] = [
  { id: 'tpl-intro', name: 'Intro outreach', subject: 'Quick intro?' },
  { id: 'tpl-followup', name: 'Follow-up', subject: 'Checking in' },
];

const FIRST_NAMES = [
  'Maya', 'Devon', 'Priya', 'Marcus', 'Ines', 'Hiro', 'Lucia', 'Sam',
  'Aaliyah', 'Noah', 'Yusra', 'Theo', 'Camille', 'Ravi', 'Jules', 'Tomás',
];
const LAST_NAMES = [
  'Okafor', 'Reyes', 'Patel', 'Nguyen', 'Costa', 'Tanaka', 'Silva', 'Park',
  'Williams', 'Brown', 'Ahmed', 'Anders', 'Dubois', 'Iyer', 'Moreau', 'Ruiz',
];
const HEADLINES = [
  'Backend engineer • Go / Postgres',
  'Frontend lead • React, design systems',
  'Full-stack • TypeScript, AWS',
  'Senior product designer • B2B SaaS',
  'GTM ops • Salesforce, RevOps',
  'Staff engineer • Distributed systems',
  'iOS engineer • Swift, SwiftUI',
  'Data engineer • dbt, Snowflake',
];
const LOCATIONS = [
  'Brooklyn, NY', 'Austin, TX', 'Seattle, WA', 'Remote — EU',
  'London, UK', 'Toronto, ON', 'Lisbon, PT', 'Berlin, DE',
];
const SKILLS_POOL = [
  'TypeScript', 'React', 'Node.js', 'Go', 'Python', 'PostgreSQL',
  'AWS', 'GraphQL', 'Kubernetes', 'Figma', 'Design Systems',
  'Salesforce', 'dbt', 'Snowflake', 'Swift', 'Kotlin',
];

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length]!;
}

function buildCandidates(reqId: string): Candidate[] {
  const count = 10;
  const reqIndex = REQUISITIONS.findIndex((r) => r.externalId === reqId);
  if (reqIndex === -1) return [];
  const out: Candidate[] = [];
  for (let i = 0; i < count; i++) {
    const seed = reqIndex * 100 + i;
    const first = pick(FIRST_NAMES, seed);
    const last = pick(LAST_NAMES, seed + 7);
    const skills = [
      pick(SKILLS_POOL, seed),
      pick(SKILLS_POOL, seed + 3),
      pick(SKILLS_POOL, seed + 11),
    ];
    out.push({
      externalId: `${reqId}-cand-${i + 1}`,
      requisitionExternalId: reqId,
      fullName: `${first} ${last}`,
      headline: pick(HEADLINES, seed),
      location: pick(LOCATIONS, seed),
      resumeUrl: undefined,
      // Stable, deterministic avatar so the UI shows real images.
      photoUrl: `https://i.pravatar.cc/400?u=${reqId}-${i + 1}`,
      skills: Array.from(new Set(skills)),
      yearsExperience: 3 + ((seed * 13) % 12),
      raw: { source: 'mock', seed },
    });
  }
  return out;
}

function page<T>(items: T[]): Page<T> {
  return { items, nextCursor: null };
}

export const mockAdapter: AtsAdapter = {
  providerId: 'mock',
  displayName: 'Mock ATS (demo data)',
  authType: 'api_key',

  async beginAuth(_ctx: AuthContext): Promise<AuthBeginResult> {
    return { authorizationUrl: 'about:blank' };
  },

  async completeAuth(_ctx: AuthContext, _payload: unknown): Promise<StoredCredentials> {
    return { apiKey: 'mock-key' };
  },

  async testConnection(creds: StoredCredentials): Promise<boolean> {
    return Boolean(creds.apiKey);
  },

  async listRequisitions(_creds: StoredCredentials, _cursor?: string) {
    return page(REQUISITIONS);
  },

  async listCandidatesForRequisition(
    _creds: StoredCredentials,
    requisitionExternalId: string,
    _cursor?: string,
  ) {
    return page(buildCandidates(requisitionExternalId));
  },

  async getCandidate(_creds: StoredCredentials, candidateExternalId: string): Promise<Candidate> {
    for (const req of REQUISITIONS) {
      const found = buildCandidates(req.externalId).find(
        (c) => c.externalId === candidateExternalId,
      );
      if (found) return found;
    }
    throw new Error(`mock.getCandidate: unknown candidate "${candidateExternalId}"`);
  },

  capabilities() {
    return {
      canAdvanceStage: true,
      canReject: true,
      canApplyTag: true,
      canSendMessage: true,
      canAddNote: true,
      canSendTemplate: true,
    };
  },

  async listStages(_creds: StoredCredentials, _requisitionExternalId: string): Promise<Stage[]> {
    return STAGES;
  },

  async listTags(_creds: StoredCredentials): Promise<Tag[]> {
    return TAGS;
  },

  async listEmailTemplates(_creds: StoredCredentials): Promise<EmailTemplate[]> {
    return TEMPLATES;
  },

  async advanceCandidateStage(_creds: StoredCredentials, _input: AdvanceStageInput): Promise<void> {
    // no-op
  },
  async rejectCandidate(_creds: StoredCredentials, _input: RejectInput): Promise<void> {
    // no-op
  },
  async addCandidateTag(_creds: StoredCredentials, _input: AddTagInput): Promise<void> {
    // no-op
  },
  async sendCandidateMessage(_creds: StoredCredentials, _input: SendMessageInput): Promise<void> {
    // no-op
  },
  async addCandidateNote(_creds: StoredCredentials, _input: AddNoteInput): Promise<void> {
    // no-op
  },
};
