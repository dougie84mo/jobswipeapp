// Teamtailor adapter (in-app shell).
//
// Teamtailor uses a token-based API: `Authorization: Token token=<key>`
// plus an `X-Api-Version` header (currently `20240404`). Base URL:
// https://api.teamtailor.com/v1. JSON:API style responses.
//
// Capabilities reflect what Teamtailor exposes for candidates:
//   - advance stage: relationship update to set a candidate's stage
//   - reject: PATCH candidate with rejected: true (+ optional reason)
//   - apply tag: tags are a relationship; POST candidate-tags pivot
//   - add note: POST notes
//   - send message: messages API supports sending email to candidates
//   - email templates: triggers / templates are surfaced via API

import type { AtsAdapter } from '../../types';

const NOT_IMPLEMENTED = 'teamtailor: adapter shell — Deno client not implemented yet';

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
