// SmartRecruiters adapter (in-app shell).
//
// SmartRecruiters Customer API uses OAuth 2.0 client credentials per
// installed integration. Base URL: https://api.smartrecruiters.com. The
// real Deno client will need a SmartRecruiters Marketplace listing or a
// private OAuth app from a customer account before any HTTP can fire.
//
// Capabilities reflect what SmartRecruiters exposes for sourced /
// pipeline candidates:
//   - advance stage: PUT /jobs/{jobId}/candidates/{candidateId}/status
//   - reject: PATCH status to a "withdrawn"-class disposition
//   - apply tag: POST candidate tags
//   - add note: POST candidate notes
//   - send message: candidate email via /messages
//   - send template: email templates are surfaced via Customer API

import type { AtsAdapter } from '../../types';

const NOT_IMPLEMENTED = 'smartrecruiters: adapter shell — Deno client not implemented yet';

export const smartrecruitersAdapter: AtsAdapter = {
  providerId: 'smartrecruiters',
  displayName: 'SmartRecruiters',
  authType: 'oauth2',

  beginAuth() {
    throw new Error(NOT_IMPLEMENTED);
  },
  completeAuth() {
    throw new Error(NOT_IMPLEMENTED);
  },
  testConnection() {
    throw new Error(NOT_IMPLEMENTED);
  },
  listRequisitions() {
    throw new Error(NOT_IMPLEMENTED);
  },
  listCandidatesForRequisition() {
    throw new Error(NOT_IMPLEMENTED);
  },
  getCandidate() {
    throw new Error(NOT_IMPLEMENTED);
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
  listStages() {
    throw new Error(NOT_IMPLEMENTED);
  },
  listTags() {
    throw new Error(NOT_IMPLEMENTED);
  },
};
