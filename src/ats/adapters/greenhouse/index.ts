// Greenhouse (Harvest API) adapter.
//
// Auth model: API key (Basic auth, `<api_key>:` as username:password base64).
// API base: https://harvest.greenhouse.io/v1/
// Rate limits: 50 req/10s burst, 2 req/s sustained per token.
// Docs: https://developers.greenhouse.io/harvest.html
//
// Wire-up happens in phase 5. This file is a placeholder so the registry
// can import a real path.

import type { AtsAdapter } from '../../types';

export const greenhouseAdapter: AtsAdapter = {
  providerId: 'greenhouse',
  displayName: 'Greenhouse',
  authType: 'api_key',

  beginAuth() {
    throw new Error('greenhouse.beginAuth: not yet implemented');
  },
  completeAuth() {
    throw new Error('greenhouse.completeAuth: not yet implemented');
  },
  testConnection() {
    throw new Error('greenhouse.testConnection: not yet implemented');
  },
  listRequisitions() {
    throw new Error('greenhouse.listRequisitions: not yet implemented');
  },
  listCandidatesForRequisition() {
    throw new Error('greenhouse.listCandidatesForRequisition: not yet implemented');
  },
  getCandidate() {
    throw new Error('greenhouse.getCandidate: not yet implemented');
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
    throw new Error('greenhouse.listStages: not yet implemented');
  },
  listTags() {
    throw new Error('greenhouse.listTags: not yet implemented');
  },
};
