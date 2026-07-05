import { Link, Redirect } from 'expo-router';
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
import {
  sendEmailOtp,
  signInWithPassword,
  verifyEmailOtp,
} from '@/features/auth/auth-actions';
import { useSession } from '@/features/auth/SessionProvider';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'password' | 'otp-request' | 'otp-verify';

export default function SignInScreen() {
  const session = useSession();
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
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

  if (session.status === 'ready' && session.session) {
    return <Redirect href="/" />;
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
            Copy <ThemedText type="code">.env.example</ThemedText> to{' '}
            <ThemedText type="code">.env</ThemedText>, fill in{' '}
            <ThemedText type="code">EXPO_PUBLIC_SUPABASE_URL</ThemedText> and{' '}
            <ThemedText type="code">EXPO_PUBLIC_SUPABASE_ANON_KEY</ThemedText>{' '}
            from the Supabase dashboard, then reload the app.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  async function handlePasswordSignIn() {
    if (!email.trim() || !password) {
      Alert.alert('Missing info', 'Enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await signInWithPassword(email, password);
    } catch (err) {
      Alert.alert('Sign-in failed', toMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendCode() {
    if (!email.trim()) {
      Alert.alert('Email required', 'Enter your email so we can send a code.');
      return;
    }
    setSubmitting(true);
    try {
      await sendEmailOtp(email);
      setMode('otp-verify');
      Alert.alert('Code sent', `Check ${email.trim()} for a 6-digit code.`);
    } catch (err) {
      // sendEmailOtp uses shouldCreateUser: false, so an unknown email comes
      // back as an "otp_disabled / signups not allowed" error — translate it.
      const raw = toMessage(err);
      const noAccount = /signups not allowed/i.test(raw);
      Alert.alert(
        noAccount ? 'No account found' : 'Could not send code',
        noAccount
          ? `There's no account for ${email.trim()}. Create one from the sign-up screen first.`
          : raw,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode() {
    if (!code.trim()) {
      Alert.alert('Code required', 'Enter the 6-digit code from your email.');
      return;
    }
    setSubmitting(true);
    try {
      await verifyEmailOtp(email, code);
    } catch (err) {
      Alert.alert('Invalid code', toMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = [styles.input, { color: theme.text }];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.inner}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.form}
        >
          <ThemedText type="title">Recruit Swipe</ThemedText>

          {mode === 'password' && (
            <>
              <ThemedText themeColor="textSecondary">
                Sign in with your email and password.
              </ThemedText>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@company.com"
                placeholderTextColor={theme.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                style={inputStyle}
                editable={!submitting}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                style={inputStyle}
                editable={!submitting}
                onSubmitEditing={handlePasswordSignIn}
              />
              <PrimaryButton
                label={submitting ? 'Signing in…' : 'Sign in'}
                onPress={handlePasswordSignIn}
                disabled={submitting}
              />
              <Pressable
                onPress={() => {
                  setMode('otp-request');
                  setPassword('');
                }}
                disabled={submitting}
              >
                <ThemedText type="linkPrimary">Email me a code instead</ThemedText>
              </Pressable>
              <Link href="/reset-password" asChild>
                <Pressable disabled={submitting}>
                  <ThemedText type="linkPrimary">Forgot password?</ThemedText>
                </Pressable>
              </Link>
              <ThemedText themeColor="textSecondary" style={styles.footnote}>
                Don&apos;t have an account?{' '}
                <Link href="/sign-up" asChild>
                  <ThemedText type="linkPrimary">Sign up</ThemedText>
                </Link>
              </ThemedText>
            </>
          )}

          {mode === 'otp-request' && (
            <>
              <ThemedText themeColor="textSecondary">
                We&apos;ll email you a 6-digit code.
              </ThemedText>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@company.com"
                placeholderTextColor={theme.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                style={inputStyle}
                editable={!submitting}
                onSubmitEditing={handleSendCode}
              />
              <PrimaryButton
                label={submitting ? 'Sending…' : 'Email me a code'}
                onPress={handleSendCode}
                disabled={submitting}
              />
              <Pressable onPress={() => setMode('password')} disabled={submitting}>
                <ThemedText type="linkPrimary">Back to password sign-in</ThemedText>
              </Pressable>
            </>
          )}

          {mode === 'otp-verify' && (
            <>
              <ThemedText themeColor="textSecondary">
                Enter the 6-digit code we sent to{' '}
                <ThemedText>{email.trim()}</ThemedText>.
              </ThemedText>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={6}
                style={inputStyle}
                editable={!submitting}
                onSubmitEditing={handleVerifyCode}
              />
              <PrimaryButton
                label={submitting ? 'Verifying…' : 'Verify code'}
                onPress={handleVerifyCode}
                disabled={submitting}
              />
              <Pressable
                onPress={handleSendCode}
                disabled={submitting}
              >
                <ThemedText type="linkPrimary">Resend code</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  setMode('password');
                  setCode('');
                }}
                disabled={submitting}
              >
                <ThemedText type="linkPrimary">Back to password sign-in</ThemedText>
              </Pressable>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <ThemedText style={styles.buttonText}>{label}</ThemedText>
    </Pressable>
  );
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
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
  footnote: { marginTop: Spacing.two },
});
