// Information-first candidate card, shared by the swipe deck (and adapted by
// the candidate profile screen's row primitives).
//
// Design: recruiting signal over photos. The photo — when a provider even has
// one — renders inside the same 48px identity circle as the initials
// monogram, never as a hero image. The body leads with skills, then recent
// experience and education. Sections render only when data exists, so sparse
// providers (most of them) still produce an intentional-looking card.
//
// The body scrolls (gesture-handler ScrollView so it coexists with
// SwipeableCard's pan — see SwipeableCard for the axis split).

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  formatDateRange,
  initials,
  parseLooseDate,
} from '@/ats/candidate-utils';
import type { Candidate } from '@/ats/types';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MAX_SKILL_CHIPS = 8;
const MAX_EXPERIENCE_ROWS = 3;
const MAX_EDUCATION_ROWS = 2;
const HIGHLIGHT_COLOR = '#208AEF';

export interface CandidateCardProps {
  candidate: Candidate;
  /**
   * Skills to accent (case-insensitive) — the deck passes the active skill
   * filter values so matching chips pop without any scoring machinery.
   */
  highlightSkills?: string[];
  /**
   * 'deck' (default) fills its container and scrolls its body. 'compact'
   * sizes to content in a plain View — for FlatList rows (Grade mode), where
   * a nested ScrollView would fight the list's own scrolling — and trims to
   * identity + meta + skills.
   */
  variant?: 'deck' | 'compact';
}

export function CandidateCard({
  candidate,
  highlightSkills,
  variant = 'deck',
}: CandidateCardProps) {
  const currentRole = candidate.experience?.[0];
  // One screen-reader node so the card announces as a sentence instead of
  // reading each chip separately.
  const a11yLabel = [
    candidate.fullName,
    candidate.headline,
    candidate.location ? `Location ${candidate.location}` : null,
    candidate.yearsExperience !== undefined
      ? `${Math.round(candidate.yearsExperience)} years experience`
      : null,
    candidate.skills?.length ? `Skills: ${candidate.skills.join(', ')}` : null,
    currentRole
      ? `Current role ${[currentRole.title, currentRole.company].filter(Boolean).join(' at ')}`
      : null,
    candidate.education?.length
      ? `Education: ${candidate.education
          .map((e) => [e.degree, e.school].filter(Boolean).join(', '))
          .join('; ')}`
      : null,
  ]
    .filter(Boolean)
    .join('. ');

  if (variant === 'compact') {
    return (
      <ThemedView
        type="backgroundElement"
        style={styles.cardCompact}
        accessible
        accessibilityLabel={a11yLabel}
      >
        <View style={styles.body}>
          <IdentityHeader candidate={candidate} />
          <MetaRow candidate={candidate} />
          <SkillChips
            skills={candidate.skills}
            highlightSkills={highlightSkills}
          />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      type="backgroundElement"
      style={styles.card}
      accessible
      accessibilityLabel={a11yLabel}
    >
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <IdentityHeader candidate={candidate} />
        <MetaRow candidate={candidate} />
        <SkillChips
          skills={candidate.skills}
          highlightSkills={highlightSkills}
        />
        <ExperienceSection entries={candidate.experience} />
        <EducationSection entries={candidate.education} />
      </ScrollView>
    </ThemedView>
  );
}

function IdentityHeader({ candidate }: { candidate: Candidate }) {
  return (
    <View style={styles.identityRow}>
      <View style={styles.monogram}>
        {candidate.photoUrl ? (
          <Image
            source={{ uri: candidate.photoUrl }}
            style={styles.monogramPhoto}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <ThemedText type="smallBold">{initials(candidate.fullName)}</ThemedText>
        )}
      </View>
      <View style={styles.identityText}>
        <ThemedText type="subtitle">{candidate.fullName}</ThemedText>
        {candidate.headline ? (
          <ThemedText themeColor="textSecondary" numberOfLines={2}>
            {candidate.headline}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

function MetaRow({ candidate }: { candidate: Candidate }) {
  const theme = useTheme();
  if (!candidate.location && candidate.yearsExperience === undefined) return null;
  return (
    <View style={styles.metaRow}>
      {candidate.location ? (
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            {candidate.location}
          </ThemedText>
        </View>
      ) : null}
      {candidate.yearsExperience !== undefined ? (
        <View style={styles.metaItem}>
          <Ionicons name="briefcase-outline" size={14} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            ~{Math.round(candidate.yearsExperience)} yrs experience
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function SkillChips({
  skills,
  highlightSkills,
}: {
  skills: string[] | undefined;
  highlightSkills: string[] | undefined;
}) {
  if (!skills || skills.length === 0) return null;
  const highlighted = new Set(
    (highlightSkills ?? []).map((s) => s.trim().toLowerCase()),
  );
  const visible = skills.slice(0, MAX_SKILL_CHIPS);
  const overflow = skills.length - visible.length;
  return (
    <View style={styles.skillRow}>
      {visible.map((skill) => {
        const isMatch = highlighted.has(skill.trim().toLowerCase());
        return (
          <View
            key={skill}
            style={[styles.skillChip, isMatch && styles.skillChipMatch]}
          >
            <ThemedText
              type="small"
              style={isMatch ? styles.skillChipMatchText : undefined}
            >
              {skill}
            </ThemedText>
          </View>
        );
      })}
      {overflow > 0 ? (
        <View style={styles.skillChip}>
          <ThemedText type="small" themeColor="textSecondary">
            +{overflow} more
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function ExperienceSection({
  entries,
}: {
  entries: Candidate['experience'];
}) {
  if (!entries || entries.length === 0) return null;
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        EXPERIENCE
      </ThemedText>
      {entries.slice(0, MAX_EXPERIENCE_ROWS).map((entry, i) => {
        const range = formatDateRange(entry);
        const detail = [entry.company, range].filter(Boolean).join(' · ');
        return (
          <View key={i} style={styles.entryRow}>
            <ThemedText type="smallBold">
              {entry.title ?? entry.company ?? 'Role'}
            </ThemedText>
            {detail && detail !== entry.title ? (
              <ThemedText type="small" themeColor="textSecondary">
                {detail}
              </ThemedText>
            ) : null}
          </View>
        );
      })}
      {entries.length > MAX_EXPERIENCE_ROWS ? (
        <ThemedText type="small" themeColor="textSecondary">
          +{entries.length - MAX_EXPERIENCE_ROWS} earlier role
          {entries.length - MAX_EXPERIENCE_ROWS === 1 ? '' : 's'}
        </ThemedText>
      ) : null}
    </View>
  );
}

function EducationSection({ entries }: { entries: Candidate['education'] }) {
  if (!entries || entries.length === 0) return null;
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        EDUCATION
      </ThemedText>
      {entries.slice(0, MAX_EDUCATION_ROWS).map((entry, i) => {
        const degreeField = [entry.degree, entry.field]
          .filter(Boolean)
          .join(', ');
        const endMs = parseLooseDate(entry.end);
        const year = endMs !== undefined
          ? String(new Date(endMs).getUTCFullYear())
          : undefined;
        return (
          <View key={i} style={styles.entryRow}>
            <ThemedText type="small">
              {degreeField ? `${degreeField} — ${entry.school}` : entry.school}
              {year ? ` (${year})` : ''}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  cardCompact: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  body: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  monogram: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  monogramPhoto: { width: 48, height: 48 },
  identityText: { flex: 1, gap: Spacing.half },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  skillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  skillChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  skillChipMatch: {
    backgroundColor: 'rgba(32,138,239,0.18)',
    borderWidth: 1,
    borderColor: HIGHLIGHT_COLOR,
  },
  skillChipMatchText: { color: HIGHLIGHT_COLOR, fontWeight: '600' },
  section: { gap: Spacing.two },
  sectionTitle: { letterSpacing: 1 },
  entryRow: { gap: Spacing.half },
});
