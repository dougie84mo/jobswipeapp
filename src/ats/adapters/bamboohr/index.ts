// BambooHR ATS adapter (in-app shell).
//
// Real calls go through ats-proxy (see supabase/functions/_shared/bamboohr.ts).
// This file ships capabilities() and metadata only.
//
// Auth model: HTTP Basic (API key) + company subdomain. Both captured at
// connect time: key → Vault, subdomain → integrations.extras.company_subdomain.
//
// Capabilities reflect what the public BambooHR ATS API actually exposes:
//   - advance stage  → POST application status (change to another status)
//   - add note       → POST application comment
// Deliberately false:
//   - reject:      no dedicated reject endpoint — rejection is an advance_stage
//                  to a "rejected"-class status, not a separate action.
//   - apply tag:   the ATS API has no tag vocabulary / apply-tag endpoint.
//   - send message / template: not exposed by the public API.

import type { AtsAdapter } from '../../types';

export const bamboohrAdapter: AtsAdapter = {
  providerId: 'bamboohr',
  displayName: 'BambooHR ATS',
  authType: 'basic',

  beginAuth() {
    throw new Error('bamboohr.beginAuth: handled by ats-proxy');
  },
  completeAuth() {
    throw new Error('bamboohr.completeAuth: handled by ats-proxy');
  },
  testConnection() {
    throw new Error('bamboohr.testConnection: handled by ats-proxy');
  },
  listRequisitions() {
    throw new Error('bamboohr.listRequisitions: handled by ats-proxy');
  },
  listCandidatesForRequisition() {
    throw new Error('bamboohr.listCandidatesForRequisition: handled by ats-proxy');
  },
  getCandidate() {
    throw new Error('bamboohr.getCandidate: handled by ats-proxy');
  },
  capabilities() {
    return {
      canAdvanceStage: true,
      canReject: false,
      canApplyTag: false,
      canSendMessage: false,
      canAddNote: true,
      canSendTemplate: false,
    };
  },
  listStages() {
    throw new Error('bamboohr.listStages: handled by ats-proxy');
  },
  listTags() {
    throw new Error('bamboohr.listTags: handled by ats-proxy');
  },
};
