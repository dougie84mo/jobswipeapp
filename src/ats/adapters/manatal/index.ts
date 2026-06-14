// Manatal adapter (in-app shell — capabilities only; real HTTP lives in
// supabase/functions/_shared/manatal.ts and runs through the proxy).
//
// Manatal uses an API token via `Authorization: Token <key>`. Base URL:
// https://api.manatal.com/open/v3. DRF-style pagination (next/previous links).
//
// SCOPE: reads only in this version (jobs, candidates-via-matches, stages) —
// candidates flow into the deck, swipes record locally. Every write capability
// reports false because Manatal's stage-change schema is ambiguous (`stage` vs
// `job_pipeline_stage`) and must be confirmed against a live sandbox before we
// PATCH matches; reject / tag / note follow once that's verified.

import type { AtsAdapter } from '../../types';

const NOT_IMPLEMENTED = 'manatal: adapter shell — calls go through the proxy';

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
    // Reads-only v1 — see scope note above. Writes deferred.
    return {
      canAdvanceStage: false,
      canReject: false,
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
