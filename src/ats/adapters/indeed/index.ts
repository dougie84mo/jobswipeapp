// Indeed adapter (in-app shell).
//
// Indeed's employer-side API (job posting + applicant retrieval) is
// partner-gated — you can't self-serve API credentials the way you can
// with most ATSes. The adapter is registered so the Connect screen can
// surface Indeed as a known target, but methods throw until partner
// credentials are wired into the Deno client.
//
// Capabilities reflect what a job board can plausibly support: applying
// a tag / adding a note / "rejecting" (passing) the applicant. Advancing
// stages doesn't apply — there's no pipeline. Sending a message would
// route through Indeed's messaging API, which is also partner-gated.

import type { AtsAdapter } from '../../types';

export const indeedAdapter: AtsAdapter = {
  providerId: 'indeed',
  displayName: 'Indeed',
  authType: 'oauth2',

  beginAuth() {
    throw new Error('indeed: partner API access required');
  },
  completeAuth() {
    throw new Error('indeed: partner API access required');
  },
  testConnection() {
    throw new Error('indeed: partner API access required');
  },
  listRequisitions() {
    throw new Error('indeed: partner API access required');
  },
  listCandidatesForRequisition() {
    throw new Error('indeed: partner API access required');
  },
  getCandidate() {
    throw new Error('indeed: partner API access required');
  },
  capabilities() {
    return {
      canAdvanceStage: false,
      canReject: true,
      canApplyTag: true,
      canSendMessage: false,
      canAddNote: true,
      canSendTemplate: false,
    };
  },
  listStages() {
    throw new Error('indeed: partner API access required');
  },
  listTags() {
    throw new Error('indeed: partner API access required');
  },
};
