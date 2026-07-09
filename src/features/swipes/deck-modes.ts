// Registry of the requisition screen's working modes. The screen renders a
// dropdown from this list and branches on the selected id — adding a mode is
// one entry here plus one render branch there. Last-used mode persists at
// recruiter_profiles.app_prefs.deck_mode.

import { Ionicons } from '@expo/vector-icons';

export type DeckMode = 'swipe' | 'grade';

export interface DeckModeMeta {
  id: DeckMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

export const DECK_MODES: DeckModeMeta[] = [
  {
    id: 'swipe',
    label: 'Swipe',
    icon: 'albums-outline',
    description: 'One card at a time — pass, boost, or save.',
  },
  {
    id: 'grade',
    label: 'Grade',
    icon: 'podium-outline',
    description: 'Scroll the whole list and score candidates 1–100.',
  },
];

export function isDeckMode(value: unknown): value is DeckMode {
  return DECK_MODES.some((m) => m.id === value);
}
