import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

function readExtra(name: string): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
  const fromExtra = extra[name];
  const fromEnv = process.env[name];
  const value = fromExtra ?? fromEnv;
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in .env (EXPO_PUBLIC_*) or app.config.ts extra.`,
    );
  }
  return value;
}

const SUPABASE_URL = readExtra('EXPO_PUBLIC_SUPABASE_URL');
const SUPABASE_ANON_KEY = readExtra('EXPO_PUBLIC_SUPABASE_ANON_KEY');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
