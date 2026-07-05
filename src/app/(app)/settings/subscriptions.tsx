import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Subscriptions — stub. Billing is out of scope for now (see CLAUDE.md);
// this page is the clean extension point for when plans/billing land.

export default function SubscriptionsScreen() {
  const theme = useTheme();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView type="backgroundElement" style={styles.section}>
            <View style={styles.planRow}>
              <View style={styles.planBody}>
                <ThemedText type="smallBold">Current plan</ThemedText>
                <ThemedText themeColor="textSecondary">Free — early access</ThemedText>
              </View>
              <View style={styles.planPill}>
                <ThemedText type="small" style={styles.planPillText}>
                  Free
                </ThemedText>
              </View>
            </View>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.section}>
            <Ionicons name="card-outline" size={28} color={theme.textSecondary} />
            <ThemedText type="smallBold">Plans and billing are coming soon</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              During early access every feature is included on the free plan:
              unlimited sources, unlimited swipes, and configurable swipe
              actions. Paid plans will be announced before anything changes.
            </ThemedText>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  section: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  planBody: { gap: 2, flex: 1 },
  planPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    backgroundColor: '#30A46C',
  },
  planPillText: { color: 'white', fontWeight: '700' },
});
