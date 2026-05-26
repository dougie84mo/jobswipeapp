import { router, Stack } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  useCreateIntegration,
  useDeleteIntegration,
} from '@/features/integrations/queries';
import { useTheme } from '@/hooks/use-theme';
import { testConnection } from '@/ats/client';
import type { ProviderId } from '@/ats/types';

// Providers whose adapter is implemented and connectable from the app today.
// Add the next provider's id here in the same PR that ships its adapter.
const CONNECTABLE_PROVIDERS: ProviderId[] = ['mock', 'greenhouse', 'ashby'];

interface ProviderMeta {
  name: string;
  subtitle: string;
  ready: boolean;
  authType: 'none' | 'api_key' | 'oauth';
  apiKeyLabel?: string;
  apiKeyHint?: string;
  onBehalfOfLabel?: string;
  onBehalfOfHint?: string;
}

const PROVIDER_META: Record<string, ProviderMeta> = {
  mock: {
    name: 'Mock ATS',
    subtitle: 'Deterministic demo data — no real ATS required.',
    ready: true,
    authType: 'none',
  },
  greenhouse: {
    name: 'Greenhouse',
    subtitle: 'Harvest API • API key auth',
    ready: true,
    authType: 'api_key',
    apiKeyLabel: 'Greenhouse Harvest API key',
    apiKeyHint:
      'Configure → Dev Center → API Credential Management → Manage API Keys. Grant Harvest read scopes (jobs / applications / candidates / job stages / tags) for sourcing, plus write scopes (move application / reject application / candidate notes / candidate tags) if you want swipe actions to fire in Greenhouse.',
    onBehalfOfLabel: 'Your Greenhouse user ID (optional)',
    onBehalfOfHint:
      'Required for write actions (advance stage, reject, add note, apply tag). Find it in Greenhouse: People → click your name → the URL ends with /users/<id>.',
  },
  lever: { name: 'Lever', subtitle: 'OAuth', ready: false, authType: 'oauth' },
  workable: { name: 'Workable', subtitle: 'OAuth', ready: false, authType: 'oauth' },
  ashby: {
    name: 'Ashby',
    subtitle: 'Ashby API • API key auth',
    ready: true,
    authType: 'api_key',
    apiKeyLabel: 'Ashby API key',
    apiKeyHint:
      'Settings → Integrations → Developer API. Grant scopes: candidatesRead, candidatesWrite, jobsRead, interviewsRead, hiringProcessMetadataRead.',
  },
  smartrecruiters: {
    name: 'SmartRecruiters',
    subtitle: 'OAuth',
    ready: false,
    authType: 'oauth',
  },
  workday: { name: 'Workday Recruiting', subtitle: 'OAuth', ready: false, authType: 'oauth' },
  bamboohr: { name: 'BambooHR ATS', subtitle: 'API key', ready: false, authType: 'api_key' },
  jazzhr: { name: 'JazzHR', subtitle: 'API key', ready: false, authType: 'api_key' },
  recruitee: { name: 'Recruitee', subtitle: 'OAuth', ready: false, authType: 'oauth' },
  teamtailor: { name: 'Teamtailor', subtitle: 'API key', ready: false, authType: 'api_key' },
  icims: { name: 'iCIMS', subtitle: 'OAuth', ready: false, authType: 'oauth' },
  manatal: { name: 'Manatal', subtitle: 'API key', ready: false, authType: 'api_key' },
};

export default function ConnectScreen() {
  const create = useCreateIntegration();
  const remove = useDeleteIntegration();
  const theme = useTheme();
  const [busy, setBusy] = useState<ProviderId | null>(null);
  const [expanded, setExpanded] = useState<ProviderId | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [onBehalfOfInput, setOnBehalfOfInput] = useState('');

  async function handleConnect(
    provider: ProviderId,
    apiKey: string,
    onBehalfOf?: string,
  ) {
    setBusy(provider);
    try {
      // Save the integration first so the proxy can find it when testConnection
      // looks it up by integrationId. We persist immediately and roll back
      // (delete) if the test fails.
      const integrationId = await create.mutateAsync({
        provider,
        displayLabel: PROVIDER_META[provider]?.name ?? provider,
        credentials: apiKey,
        onBehalfOfUserId: onBehalfOf,
      });
      try {
        const ok = await testConnection({ id: integrationId, provider });
        if (!ok) throw new Error('The provider rejected the test request.');
      } catch (err) {
        // Roll back the row we just inserted so a failed test doesn't leave
        // a broken integration with stored credentials. RLS lets the owner
        // delete their own rows.
        await remove.mutateAsync(integrationId).catch(() => {});
        Alert.alert('Couldn’t connect', toMessage(err));
        return;
      }
      router.replace('/');
    } catch (err) {
      Alert.alert('Connect failed', toMessage(err));
    } finally {
      setBusy(null);
      setExpanded(null);
      setApiKeyInput('');
      setOnBehalfOfInput('');
    }
  }

  function handleConnectClick(provider: ProviderId) {
    const meta = PROVIDER_META[provider];
    if (!meta) return;
    if (meta.authType === 'api_key') {
      if (expanded === provider) {
        const trimmed = apiKeyInput.trim();
        if (!trimmed) {
          Alert.alert('API key required', meta.apiKeyHint ?? 'Enter your API key.');
          return;
        }
        void handleConnect(provider, trimmed, onBehalfOfInput.trim() || undefined);
      } else {
        setExpanded(provider);
        setApiKeyInput('');
        setOnBehalfOfInput('');
      }
    } else {
      // mock — no creds needed; the proxy is bypassed and the in-app adapter
      // hardcodes its own key.
      void handleConnect(provider, 'mock-key');
    }
  }

  const entries = Object.entries(PROVIDER_META).sort(
    ([, a], [, b]) => Number(b.ready) - Number(a.ready),
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Connect ATS' }} />
      <SafeAreaView
        style={styles.safeArea}
        edges={['bottom', 'left', 'right']}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ThemedText themeColor="textSecondary">
              Pick the ATS you want to source from. Recruit Swipe will pull open
              requisitions and candidates and write swipe outcomes back through
              the same connection.
            </ThemedText>

            {entries.map(([provider, meta]) => {
          const connectable = CONNECTABLE_PROVIDERS.includes(provider as ProviderId);
          const isExpanded = expanded === provider;
          const isBusy = busy === provider;
          const isApiKey = meta.authType === 'api_key';
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
                    onPress={() => handleConnectClick(provider as ProviderId)}
                    disabled={busy !== null}
                    style={({ pressed }) => [
                      styles.connectButton,
                      pressed && styles.pressed,
                      busy !== null && styles.disabled,
                    ]}
                  >
                    <ThemedText style={styles.connectButtonText}>
                      {isBusy
                        ? 'Connecting…'
                        : isExpanded && isApiKey
                          ? 'Save'
                          : 'Connect'}
                    </ThemedText>
                  </Pressable>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    Coming soon
                  </ThemedText>
                )}
              </View>

              {isExpanded && isApiKey ? (
                <View style={styles.expandedForm}>
                  <ThemedText type="smallBold">{meta.apiKeyLabel}</ThemedText>
                  <TextInput
                    value={apiKeyInput}
                    onChangeText={setApiKeyInput}
                    placeholder="Paste your API key"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { color: theme.text }]}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    editable={!isBusy}
                  />
                  {meta.apiKeyHint ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {meta.apiKeyHint}
                    </ThemedText>
                  ) : null}
                  {meta.onBehalfOfLabel ? (
                    <>
                      <ThemedText type="smallBold" style={{ marginTop: Spacing.two }}>
                        {meta.onBehalfOfLabel}
                      </ThemedText>
                      <TextInput
                        value={onBehalfOfInput}
                        onChangeText={setOnBehalfOfInput}
                        placeholder="e.g. 4078347"
                        placeholderTextColor={theme.textSecondary}
                        style={[styles.input, { color: theme.text }]}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="number-pad"
                        editable={!isBusy}
                      />
                      {meta.onBehalfOfHint ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {meta.onBehalfOfHint}
                        </ThemedText>
                      ) : null}
                    </>
                  ) : null}
                </View>
              ) : null}
            </ThemedView>
          );
        })}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.three,
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
  expandedForm: {
    gap: Spacing.two,
  },
  input: {
    backgroundColor: 'rgba(127,127,127,0.18)',
    borderRadius: 8,
    padding: Spacing.three,
    fontSize: 16,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
