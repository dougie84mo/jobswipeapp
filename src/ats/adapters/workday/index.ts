// Workday Recruiting adapter (in-app shell).
//
// Workday is tenant-scoped — every customer has their own subdomain
// (base https://{tenant}.workday.com/ccx/api/recruiting/vNN/...) and OAuth 2.0.
// Workday Recruiting exposes a REST API (and a separate older SOAP integration
// surface) for jobs / candidates / dispositions. The connect flow will need the
// tenant (extras.tenant_subdomain) alongside the OAuth client.
//
// STATUS: an EXPERIMENTAL Deno scaffold exists at
// supabase/functions/_shared/workday.ts, but this adapter stays ready:false (not
// connectable) because it's UNVERIFIED on two counts: (1) auth — the recruiting
// REST API points to the 3-legged Authorization Code grant (needs an app-side
// OAuth redirect flow we don't have — ats-oauth-callback is the stub); the
// scaffold uses a client-credentials token exchange as a PLACEHOLDER; and (2) the
// candidate-retrieval endpoint + fields aren't publicly documented (GET
// /jobRequisitions is; candidates aren't). Partner-gated (ISV agreement; no
// pre-deal sandbox — tenant comes from a customer). Confirm against a real tenant
// before flipping to ready:true.
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

const NOT_IMPLEMENTED =
  'workday: experimental scaffold (ready:false) — real calls route through ats-proxy';

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
