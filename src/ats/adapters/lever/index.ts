// Lever adapter (in-app shell).
//
// Real network calls go through the ats-proxy edge function. This module
// only ships capabilities() + metadata so the UI knows which action types
// Lever supports.
//
// Auth model: API key (HTTP Basic, key as username). All writes attribute
// to the API key itself — no On-Behalf-Of equivalent.
// Capabilities reflect what the Deno client in
// supabase/functions/_shared/lever.ts actually supports.

import type { AtsAdapter } from '../../types';

export const leverAdapter: AtsAdapter = {
  providerId: 'lever',
  displayName: 'Lever',
  authType: 'api_key',

  beginAuth() {
    throw new Error('lever.beginAuth: handled by ats-proxy');
  },
  completeAuth() {
    throw new Error('lever.completeAuth: handled by ats-proxy');
  },
  testConnection() {
    throw new Error('lever.testConnection: handled by ats-proxy');
  },
  listRequisitions() {
    throw new Error('lever.listRequisitions: handled by ats-proxy');
  },
  listCandidatesForRequisition() {
    throw new Error('lever.listCandidatesForRequisition: handled by ats-proxy');
  },
  getCandidate() {
    throw new Error('lever.getCandidate: handled by ats-proxy');
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
    throw new Error('lever.listStages: handled by ats-proxy');
  },
  listTags() {
    throw new Error('lever.listTags: handled by ats-proxy');
  },
};
