// Edge function: admin-api
//
// The web admin panel's only data source. JWT-authenticated (verify_jwt
// default true — no config.toml entry needed); on top of that, the caller's
// email claim must exist in public.admin_users (checked with the service
// role — the table has RLS on with no policies, so it is service-role-only).
//
// Phase 1: five READ-ONLY actions (metrics, list_users, get_user,
// list_subscriptions, integration_health). No action returns credentials or
// Vault contents. Mutations are phase 2 and DO NOT belong here yet.
//
// Request:  POST { "action": string, "params"?: object }
// Response: 200 action result | 401 invalid token | 403 not an admin |
//           400 bad request | 500 { "error": "internal error" }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';
import { makeHandler } from './handler.ts';
import {
  getUser,
  integrationHealth,
  listSubscriptions,
  listUsers,
  metrics,
} from './actions.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function getEmail(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization');
  if (!auth) return null;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user?.email) return null;
  return data.user.email.toLowerCase();
}

async function isAdmin(email: string): Promise<boolean> {
  const { data, error } = await admin
    .from('admin_users')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (error) throw new Error(`admin_users lookup: ${error.message}`);
  return data !== null;
}

Deno.serve(makeHandler({
  getEmail,
  isAdmin,
  actions: {
    metrics: () => metrics(admin),
    list_users: (params) => listUsers(admin, params),
    get_user: (params) => getUser(admin, params),
    list_subscriptions: () => listSubscriptions(admin),
    integration_health: () => integrationHealth(admin),
  },
}));
