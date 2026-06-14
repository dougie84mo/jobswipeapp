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
