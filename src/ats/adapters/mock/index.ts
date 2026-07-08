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
  EducationEntry,
  EmailTemplate,
  ExperienceEntry,
  Page,
  RejectInput,
  Requisition,
  SendMessageInput,
  Stage,
  StoredCredentials,
  Tag,
} from '../../types';
import { deriveYearsExperience } from '../../candidate-utils';

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
const COMPANIES = [
  'Northwind Labs', 'Brightpath', 'Cobalt Systems', 'Fernworks',
  'Halcyon Data', 'Juniper & Co', 'Meridian Cloud', 'Oakline',
  'Pinnacle Robotics', 'Quartz Analytics', 'Riverbed Software', 'Solstice HQ',
];
const TITLE_TRACKS = [
  ['Software Engineer', 'Senior Software Engineer', 'Staff Engineer'],
  ['Frontend Engineer', 'Senior Frontend Engineer', 'Frontend Lead'],
  ['Product Designer', 'Senior Product Designer', 'Design Lead'],
  ['Data Analyst', 'Data Engineer', 'Senior Data Engineer'],
  ['Sales Ops Analyst', 'RevOps Manager', 'GTM Operations Lead'],
  ['iOS Engineer', 'Senior iOS Engineer', 'Mobile Lead'],
] as const;
const SCHOOLS = [
  'State University', 'City College', 'Institute of Technology',
  'Northern University', 'Polytechnic University', 'Coastal College',
];
const DEGREES = ['B.S.', 'B.A.', 'M.S.', 'B.Eng.'];
const FIELDS = [
  'Computer Science', 'Software Engineering', 'Design',
  'Information Systems', 'Mathematics', 'Business Administration',
];

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length]!;
}

// "YYYY-MM" for a date `monthsAgo` months before now. Keeps mock timelines
// realistic without hardcoding an anchor year.
function monthsAgoIso(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Contiguous employment timeline walking backwards from (roughly) now:
// 2–4 roles of 14–40 months each along a seeded title track. ~60% of
// candidates are currently employed (latest role open-ended).
function buildExperience(seed: number): ExperienceEntry[] {
  const track = pick(TITLE_TRACKS, seed);
  const roleCount = 2 + (seed % 3); // 2–4
  const currentlyEmployed = seed % 5 < 3; // ~60%
  const entries: ExperienceEntry[] = [];
  // If not currently employed, the latest role ended a few months back.
  let boundary = currentlyEmployed ? 0 : 2 + (seed % 5);
  for (let r = 0; r < roleCount; r++) {
    const duration = 14 + ((seed * 7 + r * 13) % 27); // 14–40 months
    const end = r === 0 && currentlyEmployed ? undefined : monthsAgoIso(boundary);
    const start = monthsAgoIso(boundary + duration);
    entries.push({
      // Seniority descends as we walk back in time along the track.
      title: track[Math.max(0, Math.min(track.length - 1, roleCount - 1 - r))],
      company: pick(COMPANIES, seed + r * 5),
      start,
      end,
    });
    boundary += duration + 1; // one-month gap between roles
  }
  return entries;
}

function buildEducation(seed: number, experienceMonths: number): EducationEntry[] {
  const count = 1 + (seed % 2); // 1–2
  const entries: EducationEntry[] = [];
  // Graduation lands just before the earliest job started.
  let gradBoundary = experienceMonths + 2;
  for (let e = 0; e < count; e++) {
    entries.push({
      school: pick(SCHOOLS, seed + e * 3),
      degree: pick(DEGREES, seed + e * 7),
      field: pick(FIELDS, seed + e * 11),
      end: monthsAgoIso(gradBoundary),
    });
    gradBoundary += 24 + (seed % 24); // prior degree ended ~2-4 yrs earlier
  }
  return entries;
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
    const skillCount = 3 + (seed % 4); // 3–6
    const skills = Array.from(
      { length: skillCount },
      (_, k) => pick(SKILLS_POOL, seed + k * 3 + 1),
    );
    const experience = buildExperience(seed);
    // Total months the timeline spans, for anchoring education before it.
    const totalMonths = experience.reduce(
      (acc, _e, r) => acc + 14 + ((seed * 7 + r * 13) % 27) + 1,
      seed % 5 < 3 ? 0 : 2 + (seed % 5),
    );
    out.push({
      externalId: `${reqId}-cand-${i + 1}`,
      requisitionExternalId: reqId,
      fullName: `${first} ${last}`,
      headline: pick(HEADLINES, seed),
      location: pick(LOCATIONS, seed),
      // ~40% carry a resume link so the has-resume filter is exercisable.
      resumeUrl: seed % 5 < 2
        ? `https://example.com/resumes/${reqId}-cand-${i + 1}.pdf`
        : undefined,
      // Photos are the exception, not the rule — real ATSes rarely provide
      // them, and the info-first card treats initials as the common case.
      photoUrl: i % 5 === 0
        ? `https://i.pravatar.cc/400?u=${reqId}-${i + 1}`
        : undefined,
      skills: Array.from(new Set(skills)),
      yearsExperience: deriveYearsExperience(experience),
      experience,
      education: buildEducation(seed, totalMonths),
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
