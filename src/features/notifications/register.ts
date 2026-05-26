// Push-token registration.
//
// On sign-in, ask expo-notifications for the device's ExponentPushToken and
// hand it to the register_device_token RPC. The token survives sign-out
// (it's the device, not the session); we re-register on every sign-in so
// last_seen_at stays current and so a sign-out + sign-in-as-different-user
// reassigns the token to the new user (the RPC handles the swap on
// expo_push_token's unique constraint).
//
// In stock Expo Go (SDK 54+) getExpoPushTokenAsync rejects with
// "expo-notifications functionality is not fully supported in Expo Go".
// We catch and continue silently — the rest of the app stays usable; push
// just doesn't fire until the project moves to a dev client.

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getSupabase } from '@/lib/supabase';

function getPlatform(): 'ios' | 'android' | 'web' | 'unknown' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'web') return 'web';
  return 'unknown';
}

export async function registerPushToken(): Promise<void> {
  // Push notifications aren't meaningful on the web build, and on simulators
  // expo-notifications can't issue a real token. Bail out early in both
  // cases so we don't surface a misleading error to the recruiter.
  if (Platform.OS === 'web' || !Device.isDevice) return;

  let granted = false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    granted = existingStatus === 'granted';
    if (!granted) {
      const { status } = await Notifications.requestPermissionsAsync();
      granted = status === 'granted';
    }
  } catch {
    // Permissions API may not be wired in some environments — silently no-op.
    return;
  }
  if (!granted) return;

  // Expo's getExpoPushTokenAsync needs the EAS project id once you're on a
  // dev client. In Expo Go it doesn't have one and the call rejects; we
  // catch and treat as "push isn't available yet on this build".
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig
      ?.projectId;

  let token: string;
  try {
    const res = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    token = res.data;
  } catch {
    return;
  }
  if (!token) return;

  try {
    await getSupabase().rpc('register_device_token', {
      p_expo_push_token: token,
      p_platform: getPlatform(),
      p_device_name: Device.modelName ?? null,
    });
  } catch {
    // Registration failure shouldn't break the login flow.
  }
}
