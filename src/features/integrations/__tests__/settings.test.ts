// actionsForDirection resolves team inheritance: the caller's own settings
// row wins; without one, the only other visible row (RLS: the connection
// owner's team default) applies.

// settings.ts imports the Supabase client (native AsyncStorage) for its
// hooks; this suite only exercises the pure resolver, so stub the module.
jest.mock('@/lib/supabase', () => ({ getSupabase: () => ({}) }));

// eslint-disable-next-line import/first
import {
  actionsForDirection,
  type IntegrationSettingsRow,
} from '@/features/integrations/settings';

const OWNER = 'owner-user';
const MEMBER = 'member-user';

function row(
  direction: IntegrationSettingsRow['direction'],
  userId: string,
  note: string,
): IntegrationSettingsRow {
  return {
    id: `${direction}-${userId}`,
    integration_id: 'int-1',
    direction,
    actions: [{ type: 'add_note', text: note }],
    user_id: userId,
  };
}

describe('actionsForDirection', () => {
  it('returns [] with no rows', () => {
    expect(actionsForDirection(undefined, 'right', MEMBER)).toEqual([]);
    expect(actionsForDirection([], 'right', MEMBER)).toEqual([]);
  });

  it('prefers the member’s own row over the owner default', () => {
    const rows = [row('right', OWNER, 'owner-default'), row('right', MEMBER, 'mine')];
    expect(actionsForDirection(rows, 'right', MEMBER)).toEqual([
      { type: 'add_note', text: 'mine' },
    ]);
  });

  it('falls back to the owner default when the member has no override', () => {
    const rows = [row('right', OWNER, 'owner-default'), row('left', MEMBER, 'mine-left')];
    expect(actionsForDirection(rows, 'right', MEMBER)).toEqual([
      { type: 'add_note', text: 'owner-default' },
    ]);
  });

  it('inherits per direction independently', () => {
    const rows = [
      row('right', OWNER, 'owner-right'),
      row('left', OWNER, 'owner-left'),
      row('left', MEMBER, 'member-left'),
    ];
    expect(actionsForDirection(rows, 'right', MEMBER)).toEqual([
      { type: 'add_note', text: 'owner-right' },
    ]);
    expect(actionsForDirection(rows, 'left', MEMBER)).toEqual([
      { type: 'add_note', text: 'member-left' },
    ]);
  });

  it('returns [] for a direction nobody configured', () => {
    const rows = [row('right', OWNER, 'owner-right')];
    expect(actionsForDirection(rows, 'up', MEMBER)).toEqual([]);
  });

  it('is the owner’s own row when the caller owns the connection', () => {
    const rows = [row('right', OWNER, 'owner-right')];
    expect(actionsForDirection(rows, 'right', OWNER)).toEqual([
      { type: 'add_note', text: 'owner-right' },
    ]);
  });
});
