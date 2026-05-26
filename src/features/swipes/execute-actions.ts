// Runs a configured ActionDescriptor[] for a given candidate through the
// adapter and returns ExecutedAction[] so the caller can persist it on
// swipes.executed_actions. Each step is independent: failures don't abort
// the rest of the list, they're recorded and the loop continues. The
// Activity / history retry flow uses the same shape.
//
// Today every adapter method runs in-process. When real providers go through
// the ats-proxy edge function in phase 4, this module is the chokepoint
// that swaps in the remote call — the UI surface stays the same.

import { getAdapter } from '@/ats/registry';
import type {
  ActionDescriptor,
  Candidate,
  ExecutedAction,
  ProviderId,
  StoredCredentials,
} from '@/ats/types';

function credentialsFor(provider: ProviderId): StoredCredentials {
  if (provider === 'mock') return { apiKey: 'mock-key' };
  return {};
}

export async function executeActions(
  provider: ProviderId,
  candidate: Candidate,
  actions: ActionDescriptor[],
): Promise<ExecutedAction[]> {
  if (actions.length === 0) return [];
  const adapter = getAdapter(provider);
  const creds = credentialsFor(provider);
  const out: ExecutedAction[] = [];

  for (const descriptor of actions) {
    const executedAt = new Date().toISOString();
    try {
      switch (descriptor.type) {
        case 'advance_stage':
          if (!adapter.advanceCandidateStage) {
            out.push(skip(descriptor, executedAt, 'Provider does not support advance_stage'));
            continue;
          }
          await adapter.advanceCandidateStage(creds, {
            candidateExternalId: candidate.externalId,
            stageId: descriptor.stage_id,
          });
          break;
        case 'reject':
          if (!adapter.rejectCandidate) {
            out.push(skip(descriptor, executedAt, 'Provider does not support reject'));
            continue;
          }
          await adapter.rejectCandidate(creds, {
            candidateExternalId: candidate.externalId,
            reasonId: descriptor.reason_id,
          });
          break;
        case 'apply_tag':
          if (!adapter.addCandidateTag) {
            out.push(skip(descriptor, executedAt, 'Provider does not support apply_tag'));
            continue;
          }
          await adapter.addCandidateTag(creds, {
            candidateExternalId: candidate.externalId,
            tagId: descriptor.tag_id,
          });
          break;
        case 'send_template':
          if (!adapter.sendCandidateMessage) {
            out.push(skip(descriptor, executedAt, 'Provider does not support send_template'));
            continue;
          }
          await adapter.sendCandidateMessage(creds, {
            candidateExternalId: candidate.externalId,
            templateId: descriptor.template_id,
          });
          break;
        case 'add_note':
          if (!adapter.addCandidateNote) {
            out.push(skip(descriptor, executedAt, 'Provider does not support add_note'));
            continue;
          }
          await adapter.addCandidateNote(creds, {
            candidateExternalId: candidate.externalId,
            text: descriptor.text,
          });
          break;
        case 'local_only':
          // Intentional no-op — descriptor exists so the recruiter can record
          // a swipe direction without firing anything into the ATS.
          break;
      }
      out.push({ descriptor, status: 'success', executedAt });
    } catch (err) {
      out.push({
        descriptor,
        status: 'failure',
        executedAt,
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return out;
}

function skip(
  descriptor: ActionDescriptor,
  executedAt: string,
  message: string,
): ExecutedAction {
  return { descriptor, status: 'skipped', executedAt, message };
}
