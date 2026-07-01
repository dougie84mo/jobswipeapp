// iCIMS adapter (in-app shell).
//
// iCIMS Talent Cloud uses OAuth 2.0 client credentials (region-specific auth
// servers: login.icims{.com,.eu,.ca}/oauth), with a customer-specific path
// (api.icims.com/customers/{customerId}/...). The connect flow will need a
// client id/secret AND the customer id (extras.customer_id) — three inputs, so
// the current two-field connect form isn't sufficient yet.
//
// STATUS: an EXPERIMENTAL Deno scaffold exists at
// supabase/functions/_shared/icims.ts, but this adapter stays ready:false (not
// connectable) because it's UNVERIFIED. iCIMS is partner-gated (sandbox only
// after approval + a video validation step), its read model is search-then-fetch
// (POST /customers/{id}/search/{jobs,applicantworkflows} → ids, then GET each),
// and the object FIELD shapes aren't publicly documented — so the scaffold's
// field mapping is best-effort guesswork validated only against authored
// fixtures. Confirm against a partner sandbox before flipping to ready:true; the
// connect form also needs a 3rd field (client id/secret + customer id). Auth
// reuses the SmartRecruiters client-credentials pattern; see
// docs/ats-credentials-guide.md.
//
// Capabilities reflect what iCIMS exposes for candidates / applicants:
//   - advance stage: workflow / status transitions on applicantworkflow
//   - reject: status transition to a "rejected"-class workflow status
//   - apply tag: iCIMS doesn't model "tags" the same way — usually
//     custom fields or person-level attributes; deferred
//   - add note: candidate person notes
//   - send message: correspondences API supports sending email
//   - email templates: correspondences support templated sends

import type { AtsAdapter } from '../../types';

const NOT_IMPLEMENTED =
  'icims: experimental scaffold (ready:false) — real calls route through ats-proxy';

export const icimsAdapter: AtsAdapter = {
  providerId: 'icims',
  displayName: 'iCIMS',
  authType: 'oauth2',

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
      canApplyTag: false,
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
