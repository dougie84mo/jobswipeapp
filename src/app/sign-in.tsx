import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import { getAuthRedirectUri, getSupabase } from '@/lib/supabase';

export default function SignInScreen() {
  const session = useSession();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (session.status === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.inner}>
          <ThemedText>Loading…</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (session.status === 'unconfigured') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.inner}>
          <ThemedText type="title">Setup required</ThemedText>
          <ThemedText themeColor="textSecondary">
            Supabase is not configured.
          </ThemedText>
          <ThemedText>
            Copy{' '}
            <ThemedText type="code">.env.example</ThemedText> to{' '}
            <ThemedText type="code">.env</ThemedText>, fill in{' '}
            <ThemedText type="code">EXPO_PUBLIC_SUPABASE_URL</ThemedText> and{' '}
            <ThemedText type="code">EXPO_PUBLIC_SUPABASE_ANON_KEY</ThemedText>{' '}
            from the Supabase dashboard, then reload the app.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  async function sendMagicLink() {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Email required', 'Enter your work email to receive a sign-in link.');
      return;
    }
    setSubmitting(true);
    try {
      const supabase = getSupabase();
      const redirect = getAuthRedirectUri();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: redirect ? { emailRedirectTo: redirect } : undefined,
      });
      if (error) throw error;
      Alert.alert('Check your inbox', `Sign-in link sent to ${trimmed}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      Alert.alert('Sign-in failed', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.inner}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.form}
        >
          <ThemedText type="title">Recruit Swipe</ThemedText>
          <ThemedText themeColor="textSecondary">
            We&apos;ll email you a magic link to sign in.
          </ThemedText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            style={styles.input}
            editable={!submitting}
            onSubmitEditing={sendMagicLink}
          />
          <Pressable
            onPress={sendMagicLink}
            disabled={submitting}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed,
              submitting && styles.disabled,
            ]}
          >
            <ThemedText style={styles.buttonText}>
              {submitting ? 'Sending…' : 'Send magic link'}
            </ThemedText>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: Spacing.four, justifyContent: 'center' },
  form: { gap: Spacing.three },
  input: {
    backgroundColor: 'rgba(127,127,127,0.12)',
    borderRadius: 8,
    padding: Spacing.three,
    fontSize: 16,
    color: 'inherit' as never,
  },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: '600' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
