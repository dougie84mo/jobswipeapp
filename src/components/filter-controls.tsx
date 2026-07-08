// Input primitives for the candidate-filter editors, styled to sit inside
// settings-list SettingsGroup cards. Three controls:
// - ChipMultiSelectRow: free-text add + removable chips (skills, locations,
//   education keywords).
// - MinMaxStepperRow: two bounded numeric steppers; empty = unbounded.
// - StrictToggleRow: the per-filter "also exclude candidates missing this
//   info" switch (see features/filters/types.ts for the missing-data rule).

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ChipMultiSelectRow({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');

  function addDraft() {
    const value = draft.trim();
    setDraft('');
    if (!value) return;
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) return;
    onChange([...values, value]);
  }

  return (
    <View style={styles.block}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addDraft}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          submitBehavior="submit"
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
        />
        <Pressable
          onPress={addDraft}
          disabled={!draft.trim()}
          accessibilityRole="button"
          accessibilityLabel={`Add ${label.toLowerCase()}`}
          style={({ pressed }) => [
            styles.addButton,
            (!draft.trim() || pressed) && styles.dimmed,
          ]}
        >
          <Ionicons name="add" size={20} color="white" />
        </Pressable>
      </View>
      {values.length > 0 ? (
        <View style={styles.chipRow}>
          {values.map((value) => (
            <Pressable
              key={value}
              onPress={() => onChange(values.filter((v) => v !== value))}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${value}`}
              style={({ pressed }) => [styles.chip, pressed && styles.dimmed]}
            >
              <ThemedText type="small">{value}</ThemedText>
              <Ionicons name="close" size={14} color={theme.textSecondary} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function MinMaxStepperRow({
  label,
  min,
  max,
  step = 1,
  limit = 50,
  onChange,
}: {
  label: string;
  min: number | undefined;
  max: number | undefined;
  step?: number;
  limit?: number;
  onChange: (next: { min: number | undefined; max: number | undefined }) => void;
}) {
  return (
    <View style={styles.block}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.stepperRow}>
        <Stepper
          label="Min"
          value={min}
          onChange={(v) => onChange({ min: v, max })}
          step={step}
          limit={max ?? limit}
        />
        <Stepper
          label="Max"
          value={max}
          onChange={(v) => onChange({ min, max: v })}
          step={step}
          limit={limit}
          floor={min ?? 0}
        />
      </View>
    </View>
  );
}

function Stepper({
  label,
  value,
  onChange,
  step,
  limit,
  floor = 0,
}: {
  label: string;
  value: number | undefined;
  onChange: (next: number | undefined) => void;
  step: number;
  limit: number;
  floor?: number;
}) {
  const theme = useTheme();

  // "Any" (undefined) enters the range at the nearest bound; stepping below
  // the floor returns to Any. Tapping the value also resets to Any.
  function bump(delta: number) {
    if (value === undefined) {
      onChange(delta > 0 ? Math.min(floor, limit) : limit);
      return;
    }
    const next = value + delta;
    if (next < floor) {
      onChange(undefined);
      return;
    }
    onChange(Math.min(next, limit));
  }

  return (
    <View style={styles.stepper}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.stepperControls}>
        <Pressable
          onPress={() => bump(-step)}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          style={({ pressed }) => [styles.stepButton, pressed && styles.dimmed]}
        >
          <Ionicons name="remove" size={18} color={theme.text} />
        </Pressable>
        <Pressable
          onPress={() => onChange(undefined)}
          accessibilityRole="button"
          accessibilityLabel={`${label} ${value ?? 'any'}, tap to reset`}
        >
          <ThemedText style={styles.stepValue}>
            {value === undefined ? 'Any' : String(value)}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => bump(step)}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          style={({ pressed }) => [styles.stepButton, pressed && styles.dimmed]}
        >
          <Ionicons name="add" size={18} color={theme.text} />
        </Pressable>
      </View>
    </View>
  );
}

export function StrictToggleRow({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.strictRow}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.strictLabel}>
        Also exclude candidates missing this info
      </ThemedText>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.two, paddingVertical: Spacing.two },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  addButton: {
    backgroundColor: '#208AEF',
    borderRadius: 999,
    padding: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  stepperRow: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  stepper: { gap: Spacing.one },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepButton: {
    padding: Spacing.one,
    borderRadius: 999,
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  stepValue: { minWidth: 40, textAlign: 'center' },
  strictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  strictLabel: { flex: 1 },
  dimmed: { opacity: 0.6 },
});
