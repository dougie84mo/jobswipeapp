// Shared candidate-filter editor, used by both the global-defaults screen
// (settings/candidate-filters) and the per-requisition override screen
// (requisition-filters). Draft + dirty + explicit Save, same pattern as the
// swipe-action settings screen.
//
// Empty sections are stored as absent keys, EXCEPT when the per-req editor
// deliberately clears an inherited section — effectiveFilters treats a
// present-but-empty key as "no filter here", overriding the global one, so
// this editor always writes every section the user touched.

import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import {
  ChipMultiSelectRow,
  MinMaxStepperRow,
  StrictToggleRow,
} from '@/components/filter-controls';
import { ThemedText } from '@/components/themed-text';
import { SettingsGroup, RowDivider } from '@/components/settings-list';
import { Spacing } from '@/constants/theme';
import type { CandidateFilters } from './types';

export interface FilterEditorProps {
  /** Current stored value ({} when nothing stored yet). */
  value: CandidateFilters;
  onSave: (next: CandidateFilters) => void;
  saving: boolean;
  /**
   * Per-requisition mode: what the deck would inherit without an override.
   * Renders the "inherited from your defaults" note + Reset row.
   */
  inheritedValue?: CandidateFilters;
  onReset?: () => void;
}

export function FilterEditor({
  value,
  onSave,
  saving,
  inheritedValue,
  onReset,
}: FilterEditorProps) {
  const [draft, setDraft] = useState<CandidateFilters>(value);
  const [dirty, setDirty] = useState(false);

  function patch(next: Partial<CandidateFilters>) {
    setDraft((d) => ({ ...d, ...next }));
    setDirty(true);
  }

  const skills = draft.skills ?? { values: [], mode: 'any' as const };
  const years = draft.yearsExperience ?? {};
  const locations = draft.locations ?? { values: [] };
  const education = draft.education ?? { keywords: [] };

  return (
    <View style={styles.container}>
      {inheritedValue !== undefined ? (
        <ThemedText type="small" themeColor="textSecondary">
          These filters apply to this requisition only. Sections you don’t
          change here inherit your global defaults (Settings → Candidate
          filters).
        </ThemedText>
      ) : null}

      <SettingsGroup title="Skills">
        <ChipMultiSelectRow
          label="Required skills"
          placeholder="e.g. TypeScript"
          values={skills.values}
          onChange={(values) => patch({ skills: { ...skills, values } })}
        />
        <View style={styles.modeRow}>
          <ModeButton
            label="Match any"
            active={skills.mode === 'any'}
            onPress={() => patch({ skills: { ...skills, mode: 'any' } })}
          />
          <ModeButton
            label="Match all"
            active={skills.mode === 'all'}
            onPress={() => patch({ skills: { ...skills, mode: 'all' } })}
          />
        </View>
        <RowDivider />
        <StrictToggleRow
          value={skills.strict ?? false}
          onValueChange={(strict) => patch({ skills: { ...skills, strict } })}
        />
      </SettingsGroup>

      <SettingsGroup title="Experience">
        <MinMaxStepperRow
          label="Years of experience"
          min={years.min}
          max={years.max}
          onChange={({ min, max }) =>
            patch({ yearsExperience: { ...years, min, max } })
          }
        />
        <RowDivider />
        <StrictToggleRow
          value={years.strict ?? false}
          onValueChange={(strict) =>
            patch({ yearsExperience: { ...years, strict } })
          }
        />
      </SettingsGroup>

      <SettingsGroup title="Location">
        <ChipMultiSelectRow
          label="Locations (matches anywhere in the text)"
          placeholder="e.g. Remote, Austin"
          values={locations.values}
          onChange={(values) => patch({ locations: { ...locations, values } })}
        />
        <RowDivider />
        <StrictToggleRow
          value={locations.strict ?? false}
          onValueChange={(strict) => patch({ locations: { ...locations, strict } })}
        />
      </SettingsGroup>

      <SettingsGroup title="Education">
        <ChipMultiSelectRow
          label="Keywords (school, degree, or field)"
          placeholder="e.g. Computer Science"
          values={education.keywords}
          onChange={(keywords) => patch({ education: { ...education, keywords } })}
        />
        <RowDivider />
        <StrictToggleRow
          value={education.strict ?? false}
          onValueChange={(strict) => patch({ education: { ...education, strict } })}
        />
      </SettingsGroup>

      <SettingsGroup title="Resume">
        <View style={styles.resumeRow}>
          <ThemedText style={styles.resumeLabel}>
            Only candidates with a resume
          </ThemedText>
          <Switch
            value={draft.hasResume ?? false}
            onValueChange={(hasResume) =>
              patch({ hasResume: hasResume || undefined })
            }
          />
        </View>
      </SettingsGroup>

      <Pressable
        onPress={() => {
          onSave(draft);
          setDirty(false);
        }}
        disabled={!dirty || saving}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.saveButton,
          (!dirty || saving || pressed) && styles.dimmed,
        ]}
      >
        <ThemedText style={styles.saveLabel}>
          {saving ? 'Saving…' : 'Save filters'}
        </ThemedText>
      </Pressable>

      {onReset ? (
        <Pressable
          onPress={onReset}
          disabled={saving}
          accessibilityRole="button"
          style={({ pressed }) => [styles.resetButton, pressed && styles.dimmed]}
        >
          <ThemedText type="small" themeColor="textSecondary">
            Reset to my global defaults
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

function ModeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.modeButton,
        active && styles.modeButtonActive,
        pressed && styles.dimmed,
      ]}
    >
      <ThemedText type="small" style={active ? styles.modeLabelActive : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  modeButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  modeButtonActive: { backgroundColor: '#208AEF' },
  modeLabelActive: { color: 'white', fontWeight: '600' },
  resumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  resumeLabel: { flex: 1 },
  saveButton: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.three,
    borderRadius: 999,
    alignItems: 'center',
  },
  saveLabel: { color: 'white', fontWeight: '700' },
  resetButton: { alignItems: 'center', paddingVertical: Spacing.two },
  dimmed: { opacity: 0.6 },
});
