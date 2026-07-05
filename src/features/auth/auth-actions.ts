import { getSupabase } from '@/lib/supabase';

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
}

export async function signUpWithPassword(email: string, password: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return { needsConfirmation: !data.session };
}

// Verify the 6-digit code from the "Confirm your account" email. On success
// Supabase returns a session, so the recruiter lands in the app signed in.
export async function verifySignupCode(email: string, token: string) {
  const supabase = getSupabase();
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'signup',
  });
  if (error) throw error;
}

export async function resendSignupCode(email: string) {
  const supabase = getSupabase();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
  });
  if (error) throw error;
}

// shouldCreateUser: false — the code fallback signs in existing accounts only.
// Account creation goes through /sign-up so every user sets a password; without
// this, any typo'd email would silently become a phantom passwordless account.
export async function sendEmailOtp(email: string) {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
}

export async function verifyEmailOtp(email: string, token: string) {
  const supabase = getSupabase();
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;
}

// Password reset is code-based (no redirectTo): the recovery email carries a
// 6-digit {{ .Token }}, verifyRecoveryCode exchanges it for a session, and
// updatePassword sets the new password on that session. No deep link needed.
export async function sendPasswordResetCode(email: string) {
  const supabase = getSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  if (error) throw error;
}

export async function verifyRecoveryCode(email: string, token: string) {
  const supabase = getSupabase();
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'recovery',
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const supabase = getSupabase();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signOut() {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
