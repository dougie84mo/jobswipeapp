// Ashby adapter (in-app shell).
//
// All real network calls go through the ats-proxy edge function — the app
// only uses this adapter for its capabilities() and metadata (providerId,
// displayName, authType). The method bodies throw so anything that tries
// to call Ashby in-process fails loudly rather than silently returning
// nothing.
//
// Auth model: API key (HTTP Basic, key as username). Capability set
// matches what the Deno client in supabase/functions/_shared/ashby.ts
// actually supports today: advance / tag / note. Reject is deferred —
// Ashby's archive flow isn't wired yet.

import type { AtsAdapter } from '../../types';

export const ashbyAdapter: AtsAdapter = {
  providerId: 'ashby',
  displayName: 'Ashby',
  authType: 'api_key',

  beginAuth() {
    throw new Error('ashby.beginAuth: handled by ats-proxy');
  },
  completeAuth() {
    throw new Error('ashby.completeAuth: handled by ats-proxy');
  },
  testConnection() {
    throw new Error('ashby.testConnection: handled by ats-proxy');
  },
  listRequisitions() {
    throw new Error('ashby.listRequisitions: handled by ats-proxy');
  },
  listCandidatesForRequisition() {
    throw new Error('ashby.listCandidatesForRequisition: handled by ats-proxy');
  },
  getCandidate() {
    throw new Error('ashby.getCandidate: handled by ats-proxy');
  },
  capabilities() {
    return {
      canAdvanceStage: true,
      canReject: false,
      canApplyTag: true,
      canSendMessage: false,
      canAddNote: true,
      canSendTemplate: false,
    };
  },
  listStages() {
    throw new Error('ashby.listStages: handled by ats-proxy');
  },
  listTags() {
    throw new Error('ashby.listTags: handled by ats-proxy');
  },
};
