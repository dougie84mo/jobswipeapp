// Manatal adapter (in-app shell).
//
// Manatal uses an API token via `Authorization: Token <key>`. Base URL:
// https://api.manatal.com/open/v3. Standard REST + DRF-style pagination
// (page query param, next/previous links).
//
// Capabilities reflect what Manatal exposes for candidates:
//   - advance stage: PATCH candidates/{id} or pipeline transition
//   - reject: dedicated archive/reject endpoint with a reason
//   - apply tag: candidate tags supported
//   - add note: candidate activities of type "note"
//   - send message: candidate emails are surfaced but require connecting
//     an email account; not wired in-app
//   - email templates: deferred — templates exist but the send story
//     depends on the connected email channel

import type { AtsAdapter } from '../../types';

const NOT_IMPLEMENTED = 'manatal: adapter shell — Deno client not implemented yet';

export const manatalAdapter: AtsAdapter = {
  providerId: 'manatal',
  displayName: 'Manatal',
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
