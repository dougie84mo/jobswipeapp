// BambooHR ATS adapter (in-app shell).
//
// BambooHR ATS uses HTTP Basic auth with a per-user API key. Base URL:
// https://api.bamboohr.com/api/gateway.php/{company_subdomain}/v1. Like
// Workable / Recruitee, the connect form will need a subdomain (stored
// at integrations.extras.company_subdomain) plus the API key.
//
// Capabilities reflect what BambooHR ATS exposes for applicants:
//   - advance stage: PUT applicant status (workflow step)
//   - reject: status change to a "Rejected" class
//   - apply tag: candidate tags supported
//   - add note: applicant comments
//   - email templates: not exposed via the public API
//   - send message: not exposed (HR-facing only)

import type { AtsAdapter } from '../../types';

const NOT_IMPLEMENTED = 'bamboohr: adapter shell — Deno client not implemented yet';

export const bamboohrAdapter: AtsAdapter = {
  providerId: 'bamboohr',
  displayName: 'BambooHR ATS',
  authType: 'basic',

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
