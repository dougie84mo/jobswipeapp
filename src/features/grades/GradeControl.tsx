// Inline 1-100 grade editor. Collapsed it's a pill showing the current
// number (or "Grade"); tapped, it becomes [-] [number input] [+]. Steppers
// commit immediately (the mutation is optimistic, so each tap is cheap);
// the input commits on blur/submit, and emptying it clears the grade.
// Tap-to-edit — rather than an always-live TextInput — keeps a scrolling
// list from popping the keyboard on accidental touches.

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { clampGrade } from './grade-utils';

export interface GradeControlProps {
  value: number | null;
  onCommit: (value: number | null) => void;
  size?: 'small' | 'large';
  /** What's being graded, for screen readers (e.g. "Jane Doe" or "React"). */
  accessibilityLabel?: string;
}

export function GradeControl({
  value,
  onCommit,
  size = 'small',
  accessibilityLabel,
}: GradeControlProps) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const large = size === 'large';

  function openEditor() {
    setText(value != null ? String(value) : '');
    setEditing(true);
  }

  function commitText() {
    const trimmed = text.trim();
    const next = trimmed.length === 0 ? null : clampGrade(Number(trimmed));
    setEditing(false);
    if (next !== value) onCommit(next);
  }

  function step(delta: number) {
    // First tap on an ungraded item lands mid-scale instead of at an edge.
    const next = value == null ? 50 : (clampGrade(value + delta) ?? 50);
    setText(String(next));
    if (next !== value) onCommit(next);
  }

  if (!editing) {
    return (
      <Pressable
        onPress={openEditor}
        accessibilityRole="button"
        accessibilityLabel={
          value != null
            ? `Grade ${value} of 100${accessibilityLabel ? ` for ${accessibilityLabel}` : ''}. Edit`
            : `Set a grade${accessibilityLabel ? ` for ${accessibilityLabel}` : ''}`
        }
        style={({ pressed }) => [
          styles.pill,
          large && styles.pillLarge,
          value != null && styles.pillSet,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText
          type={large ? 'subtitle' : 'smallBold'}
          style={value != null ? styles.setText : undefined}
        >
          {value != null ? value : 'Grade'}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <View style={[styles.editor, large && styles.editorLarge]}>
      <Stepper label="minus" icon="remove" onPress={() => step(-1)} large={large} />
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={commitText}
        onSubmitEditing={commitText}
        keyboardType="number-pad"
        maxLength={3}
        autoFocus
        selectTextOnFocus
        accessibilityLabel={`Grade, 1 to 100${accessibilityLabel ? ` for ${accessibilityLabel}` : ''}`}
        style={[
          styles.input,
          large && styles.inputLarge,
          { color: theme.text },
        ]}
        placeholder="—"
        placeholderTextColor={theme.textSecondary}
      />
      <Stepper label="plus" icon="add" onPress={() => step(1)} large={large} />
    </View>
  );
}

function Stepper({
  label,
  icon,
  onPress,
  large,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  large: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label === 'minus' ? 'Lower grade' : 'Raise grade'}
      style={({ pressed }) => [
        styles.stepper,
        large && styles.stepperLarge,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={large ? 20 : 16} color={theme.text} />
    </Pressable>
  );
}

const GRADE_COLOR = '#208AEF';

const styles = StyleSheet.create({
  pill: {
    minWidth: 56,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  pillLarge: {
    minWidth: 88,
    paddingVertical: Spacing.two,
  },
  pillSet: {
    backgroundColor: 'rgba(32,138,239,0.18)',
    borderWidth: 1,
    borderColor: GRADE_COLOR,
  },
  setText: { color: GRADE_COLOR },
  editor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  editorLarge: { gap: Spacing.two },
  stepper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  stepperLarge: { width: 36, height: 36, borderRadius: 18 },
  input: {
    minWidth: 44,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 4,
    paddingHorizontal: Spacing.one,
    borderRadius: Spacing.one,
    backgroundColor: 'rgba(127,127,127,0.12)',
  },
  inputLarge: { minWidth: 60, fontSize: 20 },
  pressed: { opacity: 0.7 },
});
