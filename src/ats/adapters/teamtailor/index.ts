// Teamtailor adapter (in-app shell — capabilities only; real HTTP lives in
// supabase/functions/_shared/teamtailor.ts and runs through the proxy).
//
// Teamtailor uses a token-based API: `Authorization: Token token=<key>` plus an
// `X-Api-Version` header. Base URL: https://api.teamtailor.com/v1. JSON:API.
//
// Shipped capabilities (this version): advance stage + reject. Both PATCH the
// candidate's job-application. Deferred — capabilities() reports false so the
// settings UI doesn't offer them:
//   - apply tag: Teamtailor tags are free-form strings with no list/vocab
//     endpoint, so there's nothing to populate the tag picker with.
//   - add note: the activities/notes endpoint needs a Teamtailor `user` id we
//     don't capture at connect time (a future extras key).
//   - send message / template: messaging API not wired yet.

import type { AtsAdapter } from '../../types';

const NOT_IMPLEMENTED = 'teamtailor: adapter shell — calls go through the proxy';

export const teamtailorAdapter: AtsAdapter = {
  providerId: 'teamtailor',
  displayName: 'Teamtailor',
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
      canApplyTag: false,
      canSendMessage: false,
      canAddNote: false,
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
