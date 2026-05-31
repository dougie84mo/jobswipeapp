// iCIMS adapter (in-app shell).
//
// iCIMS Talent Cloud uses OAuth 2.0 client credentials per integration,
// with a customer-specific subdomain (e.g. api.icims.com/customers/{id}).
// The connect flow will need both a client id/secret and the customer id
// (stored at integrations.extras.customer_id).
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

const NOT_IMPLEMENTED = 'icims: adapter shell — Deno client not implemented yet';

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
