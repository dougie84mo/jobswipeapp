// JazzHR adapter (in-app shell).
//
// JazzHR (formerly The Resumator) uses an API key passed as `apikey` on
// every request. Base URL: https://api.resumatorapi.com/v1. Pricing-tier
// gated — only Pro and above plans expose the API.
//
// Capabilities reflect what JazzHR exposes for applicants:
//   - advance stage: POST applicants/{id}/workflow_steps/{stepId}
//   - reject: applicant status set to a "rejected"-class workflow step
//   - apply tag: applicant tags supported
//   - add note: applicant notes
//   - send message: not surfaced as a first-class API endpoint
//   - email templates: deferred — templates exist but the send-from-API
//     story is limited

import type { AtsAdapter } from '../../types';

const NOT_IMPLEMENTED = 'jazzhr: adapter shell — Deno client not implemented yet';

export const jazzhrAdapter: AtsAdapter = {
  providerId: 'jazzhr',
  displayName: 'JazzHR',
  authType: 'api_key',

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
      canSendMessage: false,
      canAddNote: true,
      canSendTemplate: false,
    };
  },
  listStages() {
    throw new Error(NOT_IMPLEMENTED);
  },
  listTags() {
    throw new Error(NOT_IMPLEMENTED);
  },
};
