// Workable adapter (in-app shell).
//
// Real calls go through ats-proxy. This file ships capabilities() and
// metadata only.
//
// Auth model: Bearer access token + account subdomain. Both captured at
// connect time: token → Vault, subdomain → integrations.extras.subdomain.

import type { AtsAdapter } from '../../types';

export const workableAdapter: AtsAdapter = {
  providerId: 'workable',
  displayName: 'Workable',
  authType: 'api_key',

  beginAuth() {
    throw new Error('workable.beginAuth: handled by ats-proxy');
  },
  completeAuth() {
    throw new Error('workable.completeAuth: handled by ats-proxy');
  },
  testConnection() {
    throw new Error('workable.testConnection: handled by ats-proxy');
  },
  listRequisitions() {
    throw new Error('workable.listRequisitions: handled by ats-proxy');
  },
  listCandidatesForRequisition() {
    throw new Error('workable.listCandidatesForRequisition: handled by ats-proxy');
  },
  getCandidate() {
    throw new Error('workable.getCandidate: handled by ats-proxy');
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
    throw new Error('workable.listStages: handled by ats-proxy');
  },
  listTags() {
    throw new Error('workable.listTags: handled by ats-proxy');
  },
};
