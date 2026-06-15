// Edge function: detect-new-candidates
//
// Scans every enabled notification_topics row, lists the live ATS candidates
// for that requisition, and fires send-push for genuinely NEW arrivals.
//
// Auth: service-role only (like send-push) — meant to be invoked on a schedule
// (pg_cron + pg_net, or an external scheduler), not from the app. Reject any
// call without the service-role key.
//
// Per topic:
//   - first pass (last_scanned_at is null): record every live candidate into
//     notification_seen as the BASELINE, no push.
//   - later passes: new = live candidates not in notification_seen → one push
//     summarizing the count; record the new ids.
// last_scanned_at is stamped after each pass so the baseline runs exactly once.
//
// Delivery caveat: real Expo push delivery needs a dev client (Expo Go can't
// issue tokens) — see send-push. The detection pipeline itself runs regardless;
// send-push no-ops cleanly when there are no tokens.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';

import { listCandidatesForProvider } from '../_shared/dispatch.ts';

interface Scan {
  topic_id: string;
  user_id: string;
  integration_id: string;
  provider: string;
  extras: Record<string, unknown> | null;
  requisition_external_id: string;
  credentials: string;
  last_scanned_at: string | null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405);
  }

  const auth = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!serviceRoleKey || !supabaseUrl) {
    return jsonResponse({ error: 'edge function not configured' }, 500);
  }
  if (!auth || auth !== `Bearer ${serviceRoleKey}`) {
    // Only reachable from other edge functions / the scheduler holding the key.
    return jsonResponse({ error: 'forbidden' }, 403);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: scansRaw, error: scansError } = await supabase.rpc(
    'read_pending_notification_scans',
  );
  if (scansError) {
    return jsonResponse(
      { error: `scan lookup failed: ${scansError.message}` },
      500,
    );
  }
  const scans = (scansRaw ?? []) as Scan[];

  let newCandidates = 0;
  let pushed = 0;
  const errors: string[] = [];

  for (const scan of scans) {
    let live: string[];
    try {
      // Walk all pages (cursor undefined) for a complete pipeline snapshot.
      const page = await listCandidatesForProvider(
        scan.provider,
        scan.credentials,
        scan.extras ?? {},
        scan.requisition_external_id,
      );
      live = page.items.map((c) => c.externalId);
    } catch (err) {
      // PII-free: provider + topic only, never the credential or candidate data.
      const message = err instanceof Error ? err.message : 'unknown';
      console.log(JSON.stringify({
        at: 'detect-new-candidates',
        topicId: scan.topic_id,
        provider: scan.provider,
        ok: false,
        error: message,
      }));
      errors.push(scan.topic_id);
      continue;
    }

    const baseline = scan.last_scanned_at == null;
    let fresh: string[] = live;

    if (!baseline) {
      const { data: seenRows } = await supabase
        .from('notification_seen')
        .select('candidate_external_id')
        .eq('topic_id', scan.topic_id);
      const seen = new Set(
        (seenRows ?? []).map((r: { candidate_external_id: string }) =>
          r.candidate_external_id
        ),
      );
      fresh = live.filter((id) => !seen.has(id));
    }

    if (fresh.length > 0) {
      // Record the ids (baseline or new) so they aren't re-counted next pass.
      await supabase
        .from('notification_seen')
        .upsert(
          fresh.map((id) => ({
            topic_id: scan.topic_id,
            candidate_external_id: id,
          })),
          {
            onConflict: 'topic_id,candidate_external_id',
            ignoreDuplicates: true,
          },
        );

      if (!baseline) {
        newCandidates += fresh.length;
        const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: scan.user_id,
            title: 'New candidates',
            body: `${fresh.length} new candidate${
              fresh.length === 1 ? '' : 's'
            } on a requisition you're watching`,
            data: {
              integration_id: scan.integration_id,
              requisition_external_id: scan.requisition_external_id,
              count: fresh.length,
            },
          }),
        });
        if (res.ok) pushed++;
        else errors.push(`push:${scan.topic_id}`);
      }
    }

    await supabase
      .from('notification_topics')
      .update({ last_scanned_at: new Date().toISOString() })
      .eq('id', scan.topic_id);
  }

  return jsonResponse({ scanned: scans.length, newCandidates, pushed, errors });
});
