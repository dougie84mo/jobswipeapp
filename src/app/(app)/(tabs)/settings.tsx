import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NavRow, RowDivider, SettingsGroup } from '@/components/settings-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/auth-actions';
import { useSession } from '@/features/auth/SessionProvider';
import { PLAN_LABEL } from '@/features/billing/entitlements';
import { useEntitlements } from '@/features/billing/queries';
import { useRecruiterProfile } from '@/features/profile/queries';

// Settings is a pure navigation list — every option is a row pushing a
// dedicated page (which lives in the parent (app) Stack, above the tab
// bar). New settings surfaces = one new row + one new settings/ route.

export default function SettingsScreen() {
  const session = useSession();
  const userId =
    session.status === 'ready' && session.session
      ? session.session.user.id
      : undefined;
  const email =
    session.status === 'ready' && session.session
      ? session.session.user.email
      : undefined;
  const profileQuery = useRecruiterProfile(userId);
  const profileName = profileQuery.data?.display_name;
  const { entitlements } = useEntitlements();

  async function handleSignOut() {
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (err) {
      Alert.alert(
        'Sign-out failed',
        err instanceof Error ? err.message : 'Something went wrong',
      );
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SettingsGroup title="Account">
            <NavRow
              icon="person-circle-outline"
              label="Profile"
              detail={profileName ?? undefined}
              onPress={() => router.push('/settings/profile')}
            />
            <RowDivider />
            <NavRow
              icon="key-outline"
              label="Account settings"
              detail={email ?? undefined}
              onPress={() => router.push('/settings/account')}
            />
            <RowDivider />
            <NavRow
              icon="people-circle-outline"
              label="Recruit Team"
              detail="Coming soon"
              onPress={() => router.push('/settings/team')}
            />
          </SettingsGroup>

          <SettingsGroup title="Sources">
            <NavRow
              icon="add-circle-outline"
              label="Connect a source"
              onPress={() => router.push('/connect')}
            />
          </SettingsGroup>

          <SettingsGroup title="App">
            <NavRow
              icon="options-outline"
              label="Preferences"
              onPress={() => router.push('/settings/preferences')}
            />
            <RowDivider />
            <NavRow
              icon="funnel-outline"
              label="Candidate filters"
              onPress={() => router.push('/settings/candidate-filters')}
            />
            <RowDivider />
            <NavRow
              icon="card-outline"
              label="Subscriptions"
              detail={`${PLAN_LABEL[entitlements.plan]} plan`}
              onPress={() => router.push('/settings/subscriptions')}
            />
          </SettingsGroup>

          <SettingsGroup>
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [styles.signOutRow, pressed && styles.pressed]}
            >
              <Ionicons name="log-out-outline" size={20} color="#E5484D" />
              <ThemedText style={styles.signOutText}>Sign out</ThemedText>
            </Pressable>
          </SettingsGroup>

          {email ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
              Signed in as {email}
            </ThemedText>
          ) : null}
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
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  signOutText: { color: '#E5484D', fontWeight: '600' },
  footer: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
