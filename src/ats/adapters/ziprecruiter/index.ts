// ZipRecruiter adapter (in-app shell).
//
// ZipRecruiter for Employers exposes a Sponsored Jobs / applicant API that
// is partner-gated. Same posture as Indeed — the adapter is registered so
// the Connect screen can surface ZipRecruiter as a job-board option, but
// methods throw until partner credentials are wired into the Deno client.

import type { AtsAdapter } from '../../types';

export const ziprecruiterAdapter: AtsAdapter = {
  providerId: 'ziprecruiter',
  displayName: 'ZipRecruiter',
  authType: 'api_key',

  beginAuth() {
    throw new Error('ziprecruiter: partner API access required');
  },
  completeAuth() {
    throw new Error('ziprecruiter: partner API access required');
  },
  testConnection() {
    throw new Error('ziprecruiter: partner API access required');
  },
  listRequisitions() {
    throw new Error('ziprecruiter: partner API access required');
  },
  listCandidatesForRequisition() {
    throw new Error('ziprecruiter: partner API access required');
  },
  getCandidate() {
    throw new Error('ziprecruiter: partner API access required');
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
    throw new Error('ziprecruiter: partner API access required');
  },
  listTags() {
    throw new Error('ziprecruiter: partner API access required');
  },
};
