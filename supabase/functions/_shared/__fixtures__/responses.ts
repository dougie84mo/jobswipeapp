// Recorded-shape fixtures for the adapter contract tests. Values are synthetic
// — fake names / emails only, never real candidate PII. Shapes mirror the
// fields each Deno client actually reads (see the *Job / *Candidate / *Stage /
// *Tag interfaces in the corresponding _shared/<provider>.ts).
//
// Greenhouse and Recruitee use numeric ids on purpose, so the contract test can
// assert the clients stringify every id.

// ============================================================================
// Greenhouse (GET, ?page=N pagination, numeric ids)
// ============================================================================
export const greenhouse = {
  jobs: [
    {
      id: 101,
      name: 'Senior Backend Engineer',
      status: 'open',
      departments: [{ id: 1, name: 'Engineering' }],
      offices: [{ id: 9, name: 'HQ', location: { name: 'Remote (US)' } }],
    },
  ],
  applications: [{
    id: 5001,
    candidate_id: 7001,
    status: 'active',
    current_stage: { id: 30, name: 'Screen' },
  }],
  candidate: {
    id: 7001,
    first_name: 'Ada',
    last_name: 'Sample',
    title: 'Engineer',
    company: 'Acme',
    addresses: [{ value: 'Remote' }],
    attachments: [{ type: 'resume', url: 'https://files.example.test/r.pdf' }],
    photo_url: 'https://img.example.test/a.png',
    tags: ['referral'],
    employments: [
      {
        company_name: 'Acme',
        title: 'Engineer',
        start_date: '2021-03-01',
        end_date: null,
      },
      {
        company_name: 'Initech',
        title: 'Junior Engineer',
        start_date: '2018-06-01',
        end_date: '2021-02-01',
      },
    ],
    educations: [{
      school_name: 'State University',
      degree: 'B.S.',
      discipline: 'Computer Science',
      start_date: '2014-09-01',
      end_date: '2018-05-01',
    }],
  },
  stages: [
    { id: 30, name: 'Screen', active: true, priority: 1 },
    { id: 40, name: 'Onsite', active: false, priority: 2 },
  ],
  tags: [{ id: 200, name: 'shortlist' }],
};

// ============================================================================
// Ashby (POST everywhere, envelope { success, results, moreDataAvailable,
// nextCursor }, string ids)
// ============================================================================
export const ashby = {
  jobList: {
    success: true,
    results: [{
      id: 'job_a1',
      title: 'Product Designer',
      status: 'Open',
      department: { id: 'd1', name: 'Design' },
      location: { id: 'l1', name: 'NYC' },
    }],
  },
  jobListHasMore: {
    success: true,
    results: [{ id: 'job_a1', title: 'Product Designer', status: 'Open' }],
    moreDataAvailable: true,
    nextCursor: 'CURSOR_2',
  },
  applicationList: {
    success: true,
    results: [{
      id: 'app_a1',
      candidateId: 'cand_a1',
      jobId: 'job_a1',
      status: 'Active',
    }],
  },
  candidateInfo: {
    success: true,
    results: {
      id: 'cand_a1',
      name: 'Grace Sample',
      position: 'Designer',
      company: 'Acme',
      primaryLocation: { locationSummary: 'NYC' },
      tags: [{ id: 't1', title: 'portfolio' }],
    },
  },
  interviewPlan: {
    success: true,
    results: {
      id: 'plan_1',
      jobId: 'job_a1',
      interviewStages: [{
        id: 'st_1',
        title: 'Screen',
        orderInInterviewPlan: 0,
      }],
    },
  },
  candidateTagList: {
    success: true,
    results: [{ id: 'tag_a1', title: 'portfolio' }],
  },
};

// ============================================================================
// Lever (GET, envelope { data, next, hasNext }, offset pagination, string ids)
// ============================================================================
export const lever = {
  postings: {
    data: [{
      id: 'post_l1',
      text: 'Staff SRE',
      state: 'published',
      categories: { department: 'Infra', location: 'Remote' },
    }],
  },
  postingsHasNext: {
    data: [{ id: 'post_l1', text: 'Staff SRE', state: 'published' }],
    hasNext: true,
    next: 'OFFSET_2',
  },
  opportunities: {
    data: [{
      id: 'opp_l1',
      contact: {
        id: 'c_l1',
        name: 'Lin Sample',
        headline: 'SRE',
        location: { name: 'Remote' },
      },
      tags: ['priority'],
    }],
  },
  stages: {
    data: [{ id: 'stg_l1', text: 'Applicant', pipeline: 'applicant' }],
  },
  tags: { data: [{ id: 'tg_l1', text: 'priority' }] },
};

// ============================================================================
// Workable (GET, { jobs|candidates|stages|tags, paging }, next-URL pagination,
// string ids)
// ============================================================================
export const workable = {
  jobs: {
    jobs: [{
      id: 'wj1',
      shortcode: 'ABC123',
      title: 'Data Analyst',
      state: 'published',
      department: 'Data',
      location: { city: 'Austin', country: 'US' },
    }],
  },
  jobsHasNext: {
    jobs: [{
      id: 'wj1',
      shortcode: 'ABC123',
      title: 'Data Analyst',
      state: 'published',
    }],
    paging: { next: 'https://acme.workable.com/spi/v3/jobs?since_id=wj1' },
  },
  candidates: {
    candidates: [{
      id: 'wc1',
      name: 'Sam Sample',
      headline: 'Analyst',
      address: 'Austin, US',
      tags: ['sql'],
      resume_url: 'https://files.example.test/w.pdf',
    }],
  },
  // Candidate detail (GET /candidates/:id) — wrapped in { candidate }, carries
  // the structured history the per-job list omits.
  candidateDetail: {
    candidate: {
      id: 'wc1',
      name: 'Sam Sample',
      headline: 'Analyst',
      address: 'Austin, US',
      tags: ['sql'],
      resume_url: 'https://files.example.test/w.pdf',
      skills: [{ name: 'SQL' }, { name: 'Python' }],
      experience_entries: [
        {
          title: 'Data Analyst',
          company: 'Halcyon Data',
          start_date: '2022-01-01',
          end_date: null,
          current: true,
        },
        {
          title: 'BI Intern',
          company: 'Quartz Analytics',
          start_date: '2020-05-01',
          end_date: '2021-12-01',
          current: false,
        },
      ],
      education_entries: [{
        school: 'City College',
        degree: 'B.A.',
        field_of_study: 'Mathematics',
        start_date: '2016-09-01',
        end_date: '2020-05-01',
      }],
    },
  },
  stages: { stages: [{ slug: 'sourced', name: 'Sourced', position: 0 }] },
  tags: { tags: ['sql', 'python'] },
};

// ============================================================================
// Recruitee (GET, { offers|candidates|stages|tags }, ?page=N pagination,
// numeric ids)
// ============================================================================
export const recruitee = {
  offers: {
    offers: [{
      id: 301,
      title: 'Account Executive',
      slug: 'ae',
      status: 'published',
      department: { name: 'Sales' },
      location: { city: 'Denver', country_code: 'US' },
    }],
  },
  candidates: {
    candidates: [{
      id: 9001,
      name: 'Rev Sample',
      emails: ['rev@example.test'],
      photo_thumb_url: 'https://img.example.test/r.png',
      cv_url: 'https://files.example.test/cv.pdf',
      fields: [{ kind: 'position', values: [{ text: 'AE' }] }, {
        kind: 'location',
        values: [{ text: 'Denver' }],
      }],
      placements: [{ offer_id: 301, stage_id: 50, status: 'active' }],
      tags: ['inbound'],
    }],
  },
  stages: { stages: [{ id: 50, name: 'New', category: 'new', position: 0 }] },
  tags: { tags: [{ id: 400, name: 'inbound' }] },
};

// ============================================================================
// Teamtailor (JSON:API; GET, links.next pagination; string ids). Candidates are
// keyed by the job-application id, with the candidate resource in `included`.
// ============================================================================
export const teamtailor = {
  jobs: {
    data: [{
      id: 'job_tt1',
      type: 'jobs',
      attributes: { title: 'Backend Engineer', status: 'open' },
    }],
    links: { next: null },
  },
  jobsHasNext: {
    data: [{
      id: 'job_tt1',
      type: 'jobs',
      attributes: { title: 'Backend Engineer', status: 'open' },
    }],
    links: { next: 'https://api.teamtailor.com/v1/jobs?page[number]=2' },
  },
  applications: {
    data: [{
      id: 'app_tt1',
      type: 'job-applications',
      relationships: {
        candidate: { data: { id: 'cand_tt1', type: 'candidates' } },
      },
    }],
    included: [{
      id: 'cand_tt1',
      type: 'candidates',
      attributes: {
        'first-name': 'Tess',
        'last-name': 'Sample',
        pitch: 'Engineer',
        tags: ['referral'],
      },
    }],
    links: { next: null },
  },
  stages: {
    data: [{
      id: 'stg_tt1',
      type: 'stages',
      attributes: { name: 'Screening', 'row-order': 1 },
    }],
    links: { next: null },
  },
};

// ============================================================================
// Manatal (DRF { count, next, previous, results }, numeric ids). Candidate is
// embedded on the match; the normalized candidate is keyed by the match id.
// ============================================================================
export const manatal = {
  jobs: {
    count: 1,
    next: null,
    previous: null,
    results: [{
      id: 701,
      position_name: 'Sales Lead',
      status: 'open',
      address: 'Remote',
    }],
  },
  jobsHasNext: {
    count: 2,
    next: 'https://api.manatal.com/open/v3/jobs/?status=open&page=2',
    previous: null,
    results: [{ id: 701, position_name: 'Sales Lead', status: 'open' }],
  },
  matches: {
    count: 1,
    next: null,
    previous: null,
    results: [{
      id: 5001,
      candidate: { id: 9001, full_name: 'Manny Sample' },
      stage: { name: 'Screening' },
    }],
  },
  matchStages: {
    count: 1,
    next: null,
    previous: null,
    results: [{ id: 11, name: 'Screening', rank: 1 }],
  },
};

// ============================================================================
// BambooHR (Basic auth; numeric ids -> must stringify). Jobs come back as a
// bare array (no pagination); applications use a { applications,
// paginationComplete } envelope with 1-based page-number pagination. Candidates
// are keyed by the application id (the write target), not the applicant id.
// ============================================================================
export const bamboohr = {
  jobs: [
    {
      id: 801,
      title: { id: 12, label: 'Office Manager' },
      status: { id: 1, label: 'Open' },
      department: { id: 5, label: 'Operations' },
      location: { id: 8, label: 'Remote' },
    },
    // A non-open job — must be filtered out of sourcing.
    {
      id: 802,
      title: { id: 13, label: 'Archived Role' },
      status: { id: 4, label: 'Filled' },
    },
  ],
  applications: {
    applications: [{
      id: 318,
      applicant: { id: 1, firstName: 'Bree', lastName: 'Sample' },
      status: { id: 2, label: 'Active' },
    }],
    paginationComplete: true,
  },
  applicationsHasNext: {
    applications: [{
      id: 318,
      applicant: { id: 1, firstName: 'Bree', lastName: 'Sample' },
      status: { id: 2, label: 'Active' },
    }],
    paginationComplete: false,
  },
  statuses: [
    { id: 1, name: 'New' },
    { id: 2, name: 'Active' },
  ],
};

// ============================================================================
// SmartRecruiters (OAuth client-credentials; string ids; ListResult `content`
// envelope with `nextPageId` cursor). The token exchange is stubbed via the
// /identity/oauth/token route. Candidate externalId is the candidate id; writes
// target the (candidate, job) pair so the test only exercises reads.
// ============================================================================
export const smartrecruiters = {
  token: {
    access_token: 'tkn_sr_test',
    token_type: 'bearer',
    expires_in: 3600,
  },
  jobs: {
    content: [{
      id: 'job_sr1',
      title: 'Backend Engineer',
      status: 'SOURCING',
      department: { id: 'dep1', label: 'Engineering' },
      location: { city: 'Berlin', country: 'de' },
    }],
    totalFound: 1,
  },
  jobsHasNext: {
    content: [{ id: 'job_sr1', title: 'Backend Engineer', status: 'SOURCING' }],
    nextPageId: 'PAGE_2',
    totalFound: 2,
  },
  candidates: {
    content: [{
      id: 'cand_sr1',
      firstName: 'Sven',
      lastName: 'Sample',
      email: 'sven@example.test',
      location: { city: 'Berlin', country: 'de' },
    }],
    totalFound: 1,
  },
};

// ============================================================================
// JazzHR (Resumator; apikey query param; bare JSON arrays; /page/{n}
// pagination). String ids. Read-only client — candidate externalId is the
// applicant id. Non-open jobs are filtered out of sourcing.
// ============================================================================
export const jazzhr = {
  jobs: [
    {
      id: 'job_jz1',
      title: 'Sales Manager',
      status: 'Open',
      department: 'Sales',
      city: 'Austin',
      state: 'TX',
    },
    { id: 'job_jz2', title: 'Filled Role', status: 'Filled' },
  ],
  applicants: [
    {
      id: 'app_jz1',
      first_name: 'Jaz',
      last_name: 'Sample',
      job_id: 'job_jz1',
      job_title: 'Sales Manager',
    },
  ],
};

// ============================================================================
// iCIMS — ⚠️ SPECULATIVE fixtures for the EXPERIMENTAL scaffold. These shapes
// are AUTHORED guesses (iCIMS object fields aren't publicly documented), so the
// contract test only proves our normalization is internally consistent, NOT
// that it matches real iCIMS. Search-then-fetch; numeric ids -> stringify.
// ============================================================================
export const icims = {
  token: { access_token: 'tkn_icims', token_type: 'bearer', expires_in: 3600 },
  jobsSearch: {
    searchResults: [{ id: 90001, url: 'https://api.icims.test/j' }],
  },
  job: {
    jobtitle: 'Data Engineer',
    department: { value: 'Engineering' },
    joblocation: { value: 'Remote' },
  },
  applicantWorkflowsSearch: { searchResults: [{ id: 70001 }] },
  applicantWorkflow: {
    firstname: 'Ida',
    lastname: 'Sample',
    associatedprofile: { id: 5 },
  },
};

// ============================================================================
// Workday — ⚠️ SPECULATIVE fixtures for the EXPERIMENTAL scaffold. The candidate
// endpoint/fields are AUTHORED guesses; auth is a placeholder. { data, total }
// envelope with { id, descriptor } instances; offset/limit pagination.
// ============================================================================
export const workday = {
  token: { access_token: 'tkn_wd', token_type: 'bearer', expires_in: 3600 },
  jobRequisitions: {
    data: [{ id: 'req_wd1', descriptor: 'Software Engineer' }],
    total: 1,
  },
  jobRequisitionsHasNext: {
    data: [{ id: 'req_wd1', descriptor: 'Software Engineer' }],
    total: 250,
  },
  candidates: {
    data: [{ id: 'cand_wd1', descriptor: 'Wanda Sample' }],
    total: 1,
  },
};
