// Provider-agnostic read dispatch shared by the edge functions. Keeps the
// per-provider switch in one server-side place (the ats-proxy owns the
// JWT-scoped read/write switch; this is the slice the service-role
// detect-new-candidates function needs).

import {
  listCandidatesForRequisition as gh,
  type NormCandidate,
  type NormPage,
} from './greenhouse.ts';
import { listCandidatesForRequisition as ashby } from './ashby.ts';
import { listCandidatesForRequisition as lever } from './lever.ts';
import { listCandidatesForRequisition as workable } from './workable.ts';
import { listCandidatesForRequisition as recruitee } from './recruitee.ts';
import { listCandidatesForRequisition as teamtailor } from './teamtailor.ts';
import { listCandidatesForRequisition as manatal } from './manatal.ts';
import { listCandidatesForRequisition as bamboohr } from './bamboohr.ts';
import { listCandidatesForRequisition as smartrecruiters } from './smartrecruiters.ts';
import { listCandidatesForRequisition as jazzhr } from './jazzhr.ts';

function extrasStr(extras: Record<string, unknown>, key: string): string {
  const v = extras[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`dispatch: integration is missing extras.${key}`);
  }
  return v;
}

export function listCandidatesForProvider(
  provider: string,
  apiKey: string,
  extras: Record<string, unknown>,
  requisitionExternalId: string,
  cursor?: string,
): Promise<NormPage<NormCandidate>> {
  switch (provider) {
    case 'greenhouse':
      return gh(apiKey, requisitionExternalId, cursor);
    case 'ashby':
      return ashby(apiKey, requisitionExternalId, cursor);
    case 'lever':
      return lever(apiKey, requisitionExternalId, cursor);
    case 'workable':
      return workable(
        extrasStr(extras, 'subdomain'),
        apiKey,
        requisitionExternalId,
        cursor,
      );
    case 'recruitee':
      return recruitee(
        extrasStr(extras, 'company_id'),
        apiKey,
        requisitionExternalId,
        cursor,
      );
    case 'teamtailor':
      return teamtailor(apiKey, requisitionExternalId, cursor);
    case 'manatal':
      return manatal(apiKey, requisitionExternalId, cursor);
    case 'bamboohr':
      return bamboohr(
        extrasStr(extras, 'company_subdomain'),
        apiKey,
        requisitionExternalId,
        cursor,
      );
    case 'smartrecruiters':
      // OAuth client-credentials: client_id in extras, client_secret is apiKey.
      return smartrecruiters(
        extrasStr(extras, 'client_id'),
        apiKey,
        requisitionExternalId,
        cursor,
      );
    case 'jazzhr':
      return jazzhr(apiKey, requisitionExternalId, cursor);
    default:
      throw new Error(`dispatch: unsupported provider "${provider}"`);
  }
}
