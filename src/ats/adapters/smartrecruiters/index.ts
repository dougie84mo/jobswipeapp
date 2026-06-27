// SmartRecruiters adapter (in-app shell).
//
// Real calls go through ats-proxy (see supabase/functions/_shared/
// smartrecruiters.ts). This file ships capabilities() and metadata only.
//
// Auth model: OAuth 2.0 client-credentials (the project's first OAuth provider).
// The recruiter supplies a client_id + client_secret at connect time. To reuse
// the existing connect form without an OAuth redirect: client_secret → Vault
// (the credential), client_id → integrations.extras.client_id. The Deno client
// exchanges them for a bearer token server-side.
//
// Capabilities reflect what the Customer API exposes today:
//   - advance stage → PUT /candidates/{id}/jobs/{jobId}/status (main status)
//   - reject        → same PUT with status=REJECTED
// Deferred (capabilities() false):
//   - notes:  the /messages/shares path needs a shareWith user reference we
//             don't capture at connect time.
//   - tags / messages / templates: no confirmed Customer API endpoints wired.

import type { AtsAdapter } from '../../types';

export const smartrecruitersAdapter: AtsAdapter = {
  providerId: 'smartrecruiters',
  displayName: 'SmartRecruiters',
  authType: 'oauth2',

  beginAuth() {
    throw new Error('smartrecruiters.beginAuth: handled by ats-proxy');
  },
  completeAuth() {
    throw new Error('smartrecruiters.completeAuth: handled by ats-proxy');
  },
  testConnection() {
    throw new Error('smartrecruiters.testConnection: handled by ats-proxy');
  },
  listRequisitions() {
    throw new Error('smartrecruiters.listRequisitions: handled by ats-proxy');
  },
  listCandidatesForRequisition() {
    throw new Error(
      'smartrecruiters.listCandidatesForRequisition: handled by ats-proxy',
    );
  },
  getCandidate() {
    throw new Error('smartrecruiters.getCandidate: handled by ats-proxy');
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
    throw new Error('smartrecruiters.listStages: handled by ats-proxy');
  },
  listTags() {
    throw new Error('smartrecruiters.listTags: handled by ats-proxy');
  },
};
