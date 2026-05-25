import { Link, router } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/auth-actions';
import { useSession } from '@/features/auth/SessionProvider';
import {
  useIntegrations,
  type IntegrationRow,
} from '@/features/integrations/queries';

export default function HomeScreen() {
  const session = useSession();
  const integrationsQuery = useIntegrations();

  const email =
    session.status === 'ready' && session.session
      ? session.session.user.email
      : undefined;

  async function handleSignOut() {
    try {
      await signOut();
    } catch (err) {
      Alert.alert('Sign-out failed', toMessage(err));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.inner} edges={['bottom', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="title">Recruit Swipe</ThemedText>
          {email ? (
            <ThemedText themeColor="textSecondary">Signed in as {email}</ThemedText>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Connected ATS</ThemedText>
          <Link href="/connect" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.connectButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.connectButtonText}>+ Connect</ThemedText>
            </Pressable>
          </Link>
        </View>

        {integrationsQuery.isLoading ? (
          <ThemedText themeColor="textSecondary">Loading…</ThemedText>
        ) : integrationsQuery.isError ? (
          <ThemedText themeColor="textSecondary">
            Couldn’t load integrations: {toMessage(integrationsQuery.error)}
          </ThemedText>
        ) : (integrationsQuery.data ?? []).length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.empty}>
            <ThemedText type="smallBold">No ATS connected yet</ThemedText>
            <ThemedText themeColor="textSecondary">
              Connect an ATS to start sourcing candidates. The mock provider has
              demo data so you can try the swipe deck without a real account.
            </ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={integrationsQuery.data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <IntegrationCard
                item={item}
                onPress={() => router.push(`/integration/${item.id}`)}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
          />
        )}

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
        >
          <ThemedText themeColor="textSecondary">Sign out</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

function IntegrationCard({
  item,
  onPress,
}: {
  item: IntegrationRow;
  onPress: () => void;
}) {
  const connectedAt = new Date(item.connected_at);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardPressable,
        pressed && styles.pressed,
      ]}
    >
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.cardRow}>
          <ThemedText type="smallBold">
            {item.display_label ?? providerLabel(item.provider)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {item.status}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {providerLabel(item.provider)} • connected {connectedAt.toLocaleDateString()}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function providerLabel(provider: string): string {
  switch (provider) {
    case 'mock':
      return 'Mock ATS';
    case 'greenhouse':
      return 'Greenhouse';
    case 'lever':
      return 'Lever';
    default:
      return provider;
  }
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: Spacing.four, gap: Spacing.four },
  header: { gap: Spacing.one },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectButton: {
    backgroundColor: '#208AEF',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  connectButtonText: { color: 'white', fontWeight: '600' },
  empty: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  listContent: { paddingBottom: Spacing.three },
  cardPressable: { borderRadius: Spacing.three },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signOut: { padding: Spacing.three, alignSelf: 'flex-start' },
  pressed: { opacity: 0.7 },
});
