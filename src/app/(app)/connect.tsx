import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCreateIntegration } from '@/features/integrations/queries';
import { testConnection } from '@/ats/client';
import type { ProviderId } from '@/ats/types';

// Providers whose adapter is implemented and connectable from the app today.
// Add the next provider's id here in the same PR that ships its adapter.
const CONNECTABLE_PROVIDERS: ProviderId[] = ['mock'];

const PROVIDER_META: Record<
  string,
  { name: string; subtitle: string; ready: boolean }
> = {
  mock: {
    name: 'Mock ATS',
    subtitle: 'Deterministic demo data — no real ATS required.',
    ready: true,
  },
  greenhouse: { name: 'Greenhouse', subtitle: 'Harvest API • API key auth', ready: false },
  lever: { name: 'Lever', subtitle: 'OAuth', ready: false },
  workable: { name: 'Workable', subtitle: 'OAuth', ready: false },
  ashby: { name: 'Ashby', subtitle: 'API key', ready: false },
  smartrecruiters: { name: 'SmartRecruiters', subtitle: 'OAuth', ready: false },
  workday: { name: 'Workday Recruiting', subtitle: 'OAuth', ready: false },
  bamboohr: { name: 'BambooHR ATS', subtitle: 'API key', ready: false },
  jazzhr: { name: 'JazzHR', subtitle: 'API key', ready: false },
  recruitee: { name: 'Recruitee', subtitle: 'OAuth', ready: false },
  teamtailor: { name: 'Teamtailor', subtitle: 'API key', ready: false },
  icims: { name: 'iCIMS', subtitle: 'OAuth', ready: false },
  manatal: { name: 'Manatal', subtitle: 'API key', ready: false },
};

export default function ConnectScreen() {
  const create = useCreateIntegration();
  const [busy, setBusy] = useState<ProviderId | null>(null);

  async function handleConnect(provider: ProviderId) {
    setBusy(provider);
    try {
      const ok = await testConnection({ id: '__pending__', provider });
      if (!ok) {
        Alert.alert(
          'Couldn’t connect',
          'The provider rejected the test request. Check your credentials and try again.',
        );
        return;
      }
      await create.mutateAsync({
        provider,
        displayLabel: PROVIDER_META[provider]?.name ?? provider,
        // Until pgsodium is wired, anything non-empty is fine. The mock
        // adapter ignores its credentials and uses a hardcoded key.
        credentials: provider === 'mock' ? 'mock-key' : '',
      });
      router.replace('/');
    } catch (err) {
      Alert.alert('Connect failed', toMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const entries = Object.entries(PROVIDER_META).sort(
    ([, a], [, b]) => Number(b.ready) - Number(a.ready),
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Connect ATS' }} />
      <SafeAreaView style={styles.inner} edges={['bottom', 'left', 'right']}>
        <ThemedText themeColor="textSecondary">
          Pick the ATS you want to source from. Recruit Swipe will pull open
          requisitions and candidates and write swipe outcomes back through
          the same connection.
        </ThemedText>

        {entries.map(([provider, meta]) => {
          const connectable = CONNECTABLE_PROVIDERS.includes(provider as ProviderId);
          return (
            <ThemedView key={provider} type="backgroundElement" style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">{meta.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {meta.subtitle}
                  </ThemedText>
                </View>
                {connectable ? (
                  <Pressable
                    onPress={() => handleConnect(provider as ProviderId)}
                    disabled={busy !== null}
                    style={({ pressed }) => [
                      styles.connectButton,
                      pressed && styles.pressed,
                      busy !== null && styles.disabled,
                    ]}
                  >
                    <ThemedText style={styles.connectButtonText}>
                      {busy === provider ? 'Connecting…' : 'Connect'}
                    </ThemedText>
                  </Pressable>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    Coming soon
                  </ThemedText>
                )}
              </View>
            </ThemedView>
          );
        })}
      </SafeAreaView>
    </ThemedView>
  );
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  connectButton: {
    backgroundColor: '#208AEF',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  connectButtonText: { color: 'white', fontWeight: '600' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
