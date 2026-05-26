import { Link, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import { useIntegrations } from '@/features/integrations/queries';
import { useRecruiterProfile } from '@/features/profile/queries';

// Dashboard / landing tab. Surfaces who's signed in, how the recruiter's
// pipeline is wired up today, and a primary action that adapts based on
// whether they've connected anything yet.

export default function HomeScreen() {
  const session = useSession();
  const userId =
    session.status === 'ready' && session.session
      ? session.session.user.id
      : undefined;
  const profileQuery = useRecruiterProfile(userId);
  const integrationsQuery = useIntegrations();

  const email =
    session.status === 'ready' && session.session
      ? session.session.user.email
      : undefined;
  const displayName = profileQuery.data?.display_name;
  const greeting = displayName ? `Welcome, ${displayName}` : 'Welcome';

  const integrations = integrationsQuery.data ?? [];
  const hasConnections = integrations.length > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['bottom', 'left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.header}>
          <ThemedText type="title">{greeting}</ThemedText>
          {email ? (
            <ThemedText themeColor="textSecondary">Signed in as {email}</ThemedText>
          ) : null}
        </View>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle">How Recruit Swipe works</ThemedText>
          <ThemedText>
            • Connect your ATS (Greenhouse, Ashby, mock for demo){'\n'}
            • Pick a requisition to source against{'\n'}
            • Swipe right / left / up to advance, pass, or boost{'\n'}
            • Configure what each swipe does in the ATS per integration
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.statusCard}>
          {integrationsQuery.isLoading ? (
            <ThemedText themeColor="textSecondary">Loading…</ThemedText>
          ) : hasConnections ? (
            <>
              <ThemedText type="smallBold">
                {integrations.length} connection
                {integrations.length === 1 ? '' : 's'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {integrations.map((i) => i.display_label ?? i.provider).join(' • ')}
              </ThemedText>
              <Link href="/connections" asChild>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText style={styles.primaryButtonText}>
                    Start sourcing
                  </ThemedText>
                </Pressable>
              </Link>
            </>
          ) : (
            <>
              <ThemedText type="smallBold">No ATS connected yet</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Connect an ATS to start sourcing candidates. The mock provider
                has demo data so you can try the swipe deck without a real
                account.
              </ThemedText>
              <Pressable
                onPress={() => router.push('/connect')}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText style={styles.primaryButtonText}>
                  Connect your first ATS
                </ThemedText>
              </Pressable>
            </>
          )}
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
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  header: { gap: Spacing.one },
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
  statusCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  primaryButton: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.three,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  primaryButtonText: { color: 'white', fontWeight: '700' },
  pressed: { opacity: 0.85 },
});
