import { router } from 'expo-router';
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
  sendPasswordResetCode,
  updatePassword,
  verifyRecoveryCode,
} from '@/features/auth/auth-actions';
import { useTheme } from '@/hooks/use-theme';

const MIN_PASSWORD_LENGTH = 8;

// Code-based reset: request a 6-digit recovery code, verify it (which signs
// the recruiter in on a recovery session), then set the new password. No
// deep link involved, so it works in Expo Go and any future build alike.
type Step = 'request' | 'verify' | 'new-password';

export default function ResetPasswordScreen() {
  const theme = useTheme();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSendCode() {
    if (!email.trim()) {
      Alert.alert('Email required', 'Enter your account email.');
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordResetCode(email);
      setStep('verify');
      Alert.alert('Code sent', `Check ${email.trim()} for a 6-digit code.`);
    } catch (err) {
      Alert.alert('Could not send code', toMessage(err));
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
      await verifyRecoveryCode(email, code);
      setStep('new-password');
    } catch (err) {
      Alert.alert('Invalid code', toMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetPassword() {
    if (password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert(
        'Weak password',
        `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords don’t match', 'Re-enter the same password.');
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      Alert.alert('Password updated', 'You’re signed in with your new password.');
      router.replace('/');
    } catch (err) {
      Alert.alert('Could not update password', toMessage(err));
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
          <ThemedText type="title">Reset password</ThemedText>

          {step === 'request' && (
            <>
              <ThemedText themeColor="textSecondary">
                Enter your account email and we&apos;ll send a 6-digit code.
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
            </>
          )}

          {step === 'verify' && (
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
              <Pressable onPress={handleSendCode} disabled={submitting}>
                <ThemedText type="linkPrimary">Resend code</ThemedText>
              </Pressable>
            </>
          )}

          {step === 'new-password' && (
            <>
              <ThemedText themeColor="textSecondary">
                Choose a new password for{' '}
                <ThemedText>{email.trim()}</ThemedText>.
              </ThemedText>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="New password (8+ characters)"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                style={inputStyle}
                editable={!submitting}
              />
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Confirm new password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                style={inputStyle}
                editable={!submitting}
                onSubmitEditing={handleSetPassword}
              />
              <PrimaryButton
                label={submitting ? 'Saving…' : 'Set new password'}
                onPress={handleSetPassword}
                disabled={submitting}
              />
            </>
          )}

          {step !== 'new-password' && (
            <Pressable onPress={() => router.back()} disabled={submitting}>
              <ThemedText type="linkPrimary">Back to sign-in</ThemedText>
            </Pressable>
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
