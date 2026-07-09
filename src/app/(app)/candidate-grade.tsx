// Detailed grading for one candidate: overall 1-100, a score per skill, the
// fixed Experience/Education categories, and a note. Every control commits
// on its own (optimistic mutation) — there is no Save button, matching the
// grade-anytime, update-anytime product behavior.
//
// Pushed from Grade mode with search params; the candidate itself comes from
// the deck's query cache (see useCachedDeckCandidate).

import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { initials } from '@/ats/candidate-utils';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { GradeControl } from '@/features/grades/GradeControl';
import {
  gradeValuesOf,
  isEmptyGrade,
  mergeGrade,
  type GradePatch,
} from '@/features/grades/grade-utils';
import {
  useCandidateGrades,
  useSetCandidateGrade,
} from '@/features/grades/queries';
import {
  GRADE_CATEGORIES,
  GRADE_CATEGORY_LABEL,
} from '@/features/grades/types';
import { useCachedDeckCandidate } from '@/features/swipes/queries';
import { useTheme } from '@/hooks/use-theme';

export default function CandidateGradeScreen() {
  const params = useLocalSearchParams<{
    integrationId?: string;
    reqId?: string;
    candidateExternalId?: string;
    reqTitle?: string;
  }>();
  const { integrationId, reqId, candidateExternalId } = params;
  const theme = useTheme();

  const candidate = useCachedDeckCandidate(
    integrationId,
    reqId,
    candidateExternalId,
  );
  const { byCandidate } = useCandidateGrades(integrationId, reqId);
  const setGrade = useSetCandidateGrade();
  const row = candidateExternalId
    ? byCandidate.get(candidateExternalId)
    : undefined;
  const values = gradeValuesOf(row);

  // The note is drafted locally and committed on blur so each keystroke
  // doesn't fire a mutation.
  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  function commit(patch: GradePatch) {
    if (!integrationId || !reqId || !candidateExternalId) return;
    setGrade.mutate({
      integrationId,
      requisitionExternalId: reqId,
      candidateExternalId,
      values: mergeGrade(gradeValuesOf(row), patch),
    });
  }

  function clearAll() {
    if (!integrationId || !reqId || !candidateExternalId) return;
    Alert.alert(
      'Clear grade',
      'Remove your grade, skill scores, and note for this candidate?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setNoteDraft(null);
            setGrade.mutate({
              integrationId,
              requisitionExternalId: reqId,
              candidateExternalId,
              values: { grade: null, detailGrades: {}, note: null },
            });
          },
        },
      ],
    );
  }

  if (!candidate) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Grade candidate' }} />
        <SafeAreaView style={styles.inner} edges={['bottom', 'left', 'right']}>
          <ThemedText themeColor="textSecondary">
            This candidate isn’t loaded. Go back to the list and open them from
            there.
          </ThemedText>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <ThemedText style={styles.backLabel}>Go back</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Skills to grade: the candidate's listed skills plus any already-graded
  // skill that no longer appears on the profile (so its score stays visible
  // and clearable).
  const gradedSkills = Object.keys(values.detailGrades.skills ?? {});
  const skills = [
    ...(candidate.skills ?? []),
    ...gradedSkills.filter((s) => !(candidate.skills ?? []).includes(s)),
  ];

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: candidate.fullName }} />
      <SafeAreaView style={styles.inner} edges={['bottom', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.identityRow}>
            <View style={styles.monogram}>
              <ThemedText type="smallBold">
                {initials(candidate.fullName)}
              </ThemedText>
            </View>
            <View style={styles.identityText}>
              <ThemedText type="subtitle">{candidate.fullName}</ThemedText>
              {candidate.headline ? (
                <ThemedText themeColor="textSecondary" numberOfLines={2}>
                  {candidate.headline}
                </ThemedText>
              ) : null}
              {params.reqTitle ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {params.reqTitle}
                </ThemedText>
              ) : null}
            </View>
          </View>

          <ThemedView type="backgroundElement" style={styles.overallCard}>
            <View style={styles.overallText}>
              <ThemedText type="subtitle">Overall</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Your call, 1–100 — update it anytime.
              </ThemedText>
            </View>
            <GradeControl
              size="large"
              value={values.grade}
              onCommit={(value) => commit({ kind: 'overall', value })}
              accessibilityLabel={candidate.fullName}
            />
          </ThemedView>

          {skills.length > 0 ? (
            <View style={styles.section}>
              <ThemedText
                type="smallBold"
                themeColor="textSecondary"
                style={styles.sectionTitle}
              >
                SKILLS
              </ThemedText>
              {skills.map((skill) => (
                <View key={skill} style={styles.gradeRow}>
                  <ThemedText style={styles.gradeRowLabel} numberOfLines={1}>
                    {skill}
                  </ThemedText>
                  <GradeControl
                    value={values.detailGrades.skills?.[skill] ?? null}
                    onCommit={(value) =>
                      commit({ kind: 'skill', name: skill, value })
                    }
                    accessibilityLabel={skill}
                  />
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <ThemedText
              type="smallBold"
              themeColor="textSecondary"
              style={styles.sectionTitle}
            >
              CATEGORIES
            </ThemedText>
            {GRADE_CATEGORIES.map((category) => (
              <View key={category} style={styles.gradeRow}>
                <ThemedText style={styles.gradeRowLabel}>
                  {GRADE_CATEGORY_LABEL[category]}
                </ThemedText>
                <GradeControl
                  value={values.detailGrades.categories?.[category] ?? null}
                  onCommit={(value) => commit({ kind: 'category', category, value })}
                  accessibilityLabel={GRADE_CATEGORY_LABEL[category]}
                />
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <ThemedText
              type="smallBold"
              themeColor="textSecondary"
              style={styles.sectionTitle}
            >
              NOTE
            </ThemedText>
            <TextInput
              value={noteDraft ?? values.note ?? ''}
              onChangeText={setNoteDraft}
              onBlur={() => {
                if (noteDraft !== null) {
                  commit({ kind: 'note', value: noteDraft });
                  setNoteDraft(null);
                }
              }}
              multiline
              placeholder="Why this grade? Anything for the client call…"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Grading note"
              style={[styles.noteInput, { color: theme.text }]}
            />
          </View>

          {!isEmptyGrade(values) ? (
            <Pressable
              onPress={clearAll}
              accessibilityRole="button"
              style={({ pressed }) => [styles.clearRow, pressed && styles.pressed]}
            >
              <ThemedText style={styles.clearLabel}>Clear grade</ThemedText>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  body: { gap: Spacing.four, paddingBottom: Spacing.four },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  monogram: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  identityText: { flex: 1, gap: Spacing.half },
  overallCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  overallText: { flex: 1, gap: Spacing.half },
  section: { gap: Spacing.two },
  sectionTitle: { letterSpacing: 1 },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  gradeRowLabel: { flex: 1 },
  noteInput: {
    minHeight: 88,
    textAlignVertical: 'top',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(127,127,127,0.12)',
  },
  clearRow: { alignSelf: 'flex-start' },
  clearLabel: { color: '#E5484D', fontWeight: '600' },
  backButton: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  backLabel: { color: 'white', fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
