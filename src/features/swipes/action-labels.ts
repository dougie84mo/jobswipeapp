// Human-readable labels for executed swipe actions, shared by the Activity
// screen and the candidate profile.

import type { ExecutedAction } from '@/ats/types';

export function describeAction(action: ExecutedAction): string {
  const d = action.descriptor;
  switch (d.type) {
    case 'advance_stage':
      return `Advance stage → ${d.stage_id}`;
    case 'reject':
      return d.reason_id ? `Reject (${d.reason_id})` : 'Reject';
    case 'apply_tag':
      return `Apply tag → ${d.tag_id}`;
    case 'send_template':
      return `Send template → ${d.template_id}`;
    case 'add_note':
      return `Add note: "${d.text}"`;
    case 'local_only':
      return 'Record locally only';
  }
}
