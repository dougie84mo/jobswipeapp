// Runs a configured ActionDescriptor[] for a given candidate through the
// adapter (or, for non-mock providers, the ats-proxy edge function) and
// returns ExecutedAction[] so the caller can persist it on
// swipes.executed_actions. Each step is independent: failures don't abort
// the rest of the list, they're recorded and the loop continues. The
// Activity / history retry flow uses the same shape.

import {
  addCandidateNote,
  addCandidateTag,
  advanceCandidateStage,
  capabilitiesFor,
  rejectCandidate,
  type IntegrationRef,
} from '@/ats/client';
import type {
  ActionDescriptor,
  Candidate,
  ExecutedAction,
} from '@/ats/types';

export async function executeActions(
  integration: IntegrationRef,
  requisitionExternalId: string,
  candidate: Candidate,
  actions: ActionDescriptor[],
): Promise<ExecutedAction[]> {
  if (actions.length === 0) return [];
  const caps = capabilitiesFor(integration.provider);
  const out: ExecutedAction[] = [];

  for (const descriptor of actions) {
    const executedAt = new Date().toISOString();
    try {
      switch (descriptor.type) {
        case 'advance_stage':
          if (!caps.canAdvanceStage) {
            out.push(skip(descriptor, executedAt, 'Provider does not support advance_stage'));
            continue;
          }
          await advanceCandidateStage(integration, {
            candidateExternalId: candidate.externalId,
            requisitionExternalId,
            stageId: descriptor.stage_id,
          });
          break;
        case 'reject':
          if (!caps.canReject) {
            out.push(skip(descriptor, executedAt, 'Provider does not support reject'));
            continue;
          }
          await rejectCandidate(integration, {
            candidateExternalId: candidate.externalId,
            requisitionExternalId,
            reasonId: descriptor.reason_id,
          });
          break;
        case 'apply_tag':
          if (!caps.canApplyTag) {
            out.push(skip(descriptor, executedAt, 'Provider does not support apply_tag'));
            continue;
          }
          await addCandidateTag(integration, {
            candidateExternalId: candidate.externalId,
            requisitionExternalId,
            tagId: descriptor.tag_id,
          });
          break;
        case 'send_template':
          if (!caps.canSendTemplate) {
            out.push(skip(descriptor, executedAt, 'Provider does not support send_template'));
            continue;
          }
          // No client-side helper yet — sendCandidateMessage / template
          // dispatch ships in the same PR as Greenhouse template support.
          out.push(skip(descriptor, executedAt, 'send_template not wired yet'));
          continue;
        case 'add_note':
          if (!caps.canAddNote) {
            out.push(skip(descriptor, executedAt, 'Provider does not support add_note'));
            continue;
          }
          await addCandidateNote(integration, {
            candidateExternalId: candidate.externalId,
            requisitionExternalId,
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
