// Edge function: send-push
//
// Sends an Expo push notification to a target user. Looks up their device
// tokens, filters out anyone who's opted out via
// recruiter_profiles.notification_prefs.push_enabled, and forwards the
// payload to the Expo Push API (exp.host/--/api/v2/push/send).
//
// Authentication model: this function is meant to be called from OTHER
// edge functions (e.g. a future ats-webhook handler that fires on
// new-candidate events), not directly from the mobile app. It requires
// the service role key so it can read across user_ids. Reject any call
// that arrives without it.
//
// Calling shape (POST JSON):
//   {
//     "user_id": "uuid",
//     "title": "string",
//     "body": "string",
//     "data": { ... } // optional, attached to the notification payload
//   }
//
// Response: { sent: number, skipped: number, errors: string[] }
//
// Push delivery isn't testable from stock Expo Go; the registration code
// in src/features/notifications/register.ts silently no-ops there. Once
// the project moves to a dev client, registered tokens light up and this
// function starts delivering.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';

interface RequestBody {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405);
  }

  const auth = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!auth || !serviceRoleKey || auth !== `Bearer ${serviceRoleKey}`) {
    // Refuses anonymous and recruiter-JWT callers. send-push is only
    // reachable from other edge functions that hold the service role key.
    return jsonResponse({ error: 'forbidden' }, 403);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: 'invalid JSON body' }, 400);
  }
  if (!body?.user_id || !body?.title || !body?.body) {
    return jsonResponse(
      { error: 'user_id, title, and body are required' },
      400,
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!supabaseUrl) {
    return jsonResponse({ error: 'edge function not configured' }, 500);
  }

  // Service-role client bypasses RLS — needed because we're targeting
  // another user's tokens.
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Honour the opt-out before we hit the Expo API.
  const { data: profile, error: profileError } = await supabase
    .from('recruiter_profiles')
    .select('notification_prefs')
    .eq('user_id', body.user_id)
    .maybeSingle();
  if (profileError) {
    return jsonResponse({
      error: `profile lookup failed: ${profileError.message}`,
    }, 500);
  }
  if (profile && profile.notification_prefs?.push_enabled === false) {
    return jsonResponse({
      sent: 0,
      skipped: 0,
      errors: [],
      reason: 'opted-out',
    });
  }

  const { data: tokens, error: tokensError } = await supabase
    .from('device_tokens')
    .select('expo_push_token')
    .eq('user_id', body.user_id);
  if (tokensError) {
    return jsonResponse({
      error: `token lookup failed: ${tokensError.message}`,
    }, 500);
  }
  const messages: ExpoPushMessage[] = (tokens ?? []).map((t) => ({
    to: t.expo_push_token,
    title: body.title,
    body: body.body,
    data: body.data,
    sound: 'default',
  }));
  if (messages.length === 0) {
    return jsonResponse({
      sent: 0,
      skipped: 0,
      errors: [],
      reason: 'no-tokens',
    });
  }

  const errors: string[] = [];
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      errors.push(`Expo push API ${res.status}: ${text}`);
    } else {
      // Expo returns { data: [{ status: 'ok' | 'error', ... }, ...] }.
      // We don't fail the whole call on per-token errors but surface them
      // for the caller to log.
      const json = (await res.json()) as {
        data?: { status: string; message?: string }[];
      };
      for (const r of json.data ?? []) {
        if (r.status !== 'ok' && r.message) errors.push(r.message);
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Unknown error');
  }

  return jsonResponse({
    sent: messages.length - errors.length,
    skipped: 0,
    errors,
  });
});
