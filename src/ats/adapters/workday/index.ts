// Workday Recruiting adapter (in-app shell).
//
// Workday is tenant-scoped — every customer has their own subdomain
// (e.g. impl-services1.wd5.myworkdayjobs.com) and OAuth 2.0 client
// credentials. Workday Recruiting exposes a REST API (and a separate
// older SOAP integration surface) for jobs / candidates / dispositions.
//
// Capabilities reflect what's commonly modelled in Workday Recruiting:
//   - advance stage: PUT candidate disposition / stage on the
//     job application
//   - reject: disposition to a "Not selected" class
//   - add note: candidate comments
//   - send message: separate messaging system, not wired
//   - tags: Workday doesn't have a universal cross-tenant tag concept,
//     so we conservatively report canApplyTag: false
//   - templates: deferred — Workday email templates are tenant-config

import type { AtsAdapter } from '../../types';

const NOT_IMPLEMENTED = 'workday: adapter shell — Deno client not implemented yet';

export const workdayAdapter: AtsAdapter = {
  providerId: 'workday',
  displayName: 'Workday Recruiting',
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
      canSendMessage: false,
      canAddNote: true,
      canSendTemplate: false,
    };
  },
  listStages() {
    throw new Error(NOT_IMPLEMENTED);
  },
  listTags() {
    throw new Error(NOT_IMPLEMENTED);
  },
};
