// JazzHR adapter (in-app shell).
//
// Real calls go through ats-proxy (see supabase/functions/_shared/jazzhr.ts).
// This file ships capabilities() and metadata only.
//
// Auth model: API key passed as an `apikey` query param. Base URL:
// https://api.resumatorapi.com/v1. Pricing-tier gated — only Pro plans and
// above expose the API.
//
// SHIPPED READ-ONLY (all write capabilities false), same posture as Manatal.
// JazzHR's v1 write surface is under-specified and unverifiable without a
// Pro-plan account (sources conflict on POST format), and there's no endpoint
// to enumerate workflow steps, so advance-stage can't be offered cleanly.
// Candidates flow into the deck and swipes record locally.

import type { AtsAdapter } from '../../types';

export const jazzhrAdapter: AtsAdapter = {
  providerId: 'jazzhr',
  displayName: 'JazzHR',
  authType: 'api_key',

  beginAuth() {
    throw new Error('jazzhr.beginAuth: handled by ats-proxy');
  },
  completeAuth() {
    throw new Error('jazzhr.completeAuth: handled by ats-proxy');
  },
  testConnection() {
    throw new Error('jazzhr.testConnection: handled by ats-proxy');
  },
  listRequisitions() {
    throw new Error('jazzhr.listRequisitions: handled by ats-proxy');
  },
  listCandidatesForRequisition() {
    throw new Error('jazzhr.listCandidatesForRequisition: handled by ats-proxy');
  },
  getCandidate() {
    throw new Error('jazzhr.getCandidate: handled by ats-proxy');
  },
  capabilities() {
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
    throw new Error('jazzhr.listStages: handled by ats-proxy');
  },
  listTags() {
    throw new Error('jazzhr.listTags: handled by ats-proxy');
  },
};
