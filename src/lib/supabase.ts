import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

function readEnv(name: string): string | undefined {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
  return extra[name] ?? process.env[name];
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY in .env (see .env.example), then reload.',
    );
    this.name = 'SupabaseNotConfiguredError';
  }
}

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = readEnv('EXPO_PUBLIC_SUPABASE_URL');
  const anon = readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (!url || !anon) throw new SupabaseNotConfiguredError();
  cached = createClient(url, anon, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(readEnv('EXPO_PUBLIC_SUPABASE_URL') && readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'));
}

export function getAuthRedirectUri(): string | undefined {
  return readEnv('EXPO_PUBLIC_AUTH_REDIRECT_URI');
}
