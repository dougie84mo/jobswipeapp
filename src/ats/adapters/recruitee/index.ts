// Recruitee adapter (in-app shell).
//
// Real calls go through ats-proxy. Capabilities + metadata only.
//
// Auth model: Bearer personal API token + numeric company id. Both
// captured at connect time: token → Vault, company id →
// integrations.extras.company_id.

import type { AtsAdapter } from '../../types';

export const recruiteeAdapter: AtsAdapter = {
  providerId: 'recruitee',
  displayName: 'Recruitee',
  authType: 'api_key',

  beginAuth() {
    throw new Error('recruitee.beginAuth: handled by ats-proxy');
  },
  completeAuth() {
    throw new Error('recruitee.completeAuth: handled by ats-proxy');
  },
  testConnection() {
    throw new Error('recruitee.testConnection: handled by ats-proxy');
  },
  listRequisitions() {
    throw new Error('recruitee.listRequisitions: handled by ats-proxy');
  },
  listCandidatesForRequisition() {
    throw new Error('recruitee.listCandidatesForRequisition: handled by ats-proxy');
  },
  getCandidate() {
    throw new Error('recruitee.getCandidate: handled by ats-proxy');
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
    throw new Error('recruitee.listStages: handled by ats-proxy');
  },
  listTags() {
    throw new Error('recruitee.listTags: handled by ats-proxy');
  },
};
