# Recruit Swipe

Recruiter-only mobile app for swiping through ATS candidates. Candidates live in the recruiter's connected Applicant Tracking System (Greenhouse, Lever, Workable, etc.) — Recruit Swipe pulls them, presents them in a swipe deck, and pushes outcomes back to the ATS based on per-integration swipe-action configuration.

Built with Expo (managed workflow), TypeScript, Supabase, and a pluggable ATS adapter layer.

## Quick start

```bash
# 1. install deps
npm install

# 2. copy env template and fill in your Supabase project details
cp .env.example .env

# 3. start the dev server (opens Expo Dev Tools; scan the QR code with the Expo Go app)
npm start
```

Press `a` to launch on Android, `i` on iOS (macOS host required for the simulator), or `w` for web.

## Env vars

| Name | Required | Notes |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ | From the Supabase dashboard, "Project Settings → API". |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon key (RLS will enforce auth). Never the service-role key. |
| `EXPO_PUBLIC_AUTH_REDIRECT_URI` | ✅ | Dev: `recruitswipe://auth/callback`. Prod: `https://<project>.supabase.co/auth/v1/callback`. |

Anything prefixed `EXPO_PUBLIC_` is inlined into the JS bundle. **Do not put server secrets in `.env`** — ATS credentials live in Supabase encrypted with pgsodium and are decrypted only inside edge functions.

## Running Supabase locally

```bash
# requires the Supabase CLI: https://supabase.com/docs/guides/cli
supabase start            # spins up Postgres + Auth + Edge runtime locally
supabase db reset         # applies migrations and seeds the mock provider
supabase functions serve  # serves edge functions on http://127.0.0.1:54321/functions/v1
```

Local URLs:

- Studio: http://127.0.0.1:54323
- API: http://127.0.0.1:54321
- Inbucket (test email): http://127.0.0.1:54324

Set `.env` to point at `http://127.0.0.1:54321` to use the local stack from the app.

## Project layout

```
jobswipe/
  app.json                # Expo config
  eas.json                # EAS Build profiles
  package.json
  tsconfig.json           # strict
  src/
    app/                  # Expo Router screens
    components/           # shared UI
    constants/, hooks/    # template helpers
    lib/
      supabase.ts         # Supabase client
      query-client.ts     # TanStack Query
    ats/
      types.ts            # AtsAdapter interface + shared types
      registry.ts         # provider -> adapter map
      adapters/
        greenhouse/       # API-key auth (Harvest API)
        ...               # added one folder per provider
  supabase/
    migrations/           # SQL schema + RLS (0001_init.sql)
    functions/            # edge functions (ats-proxy, ats-oauth-callback, ats-sync)
    seed.sql              # mock provider + sample data for local dev
    config.toml           # Supabase CLI config
  legacy/                 # the previous Node/Express + React-web project — read-only reference
  prompts/                # gitignored — internal planning docs
  CLAUDE.md               # gitignored — project context for AI agents
```

## Adding a new ATS adapter (≤ 10 steps)

1. Pick a provider id (kebab-case, no spaces). Add it to the `ProviderId` union in `src/ats/types.ts`.
2. Create `src/ats/adapters/<provider>/index.ts` exporting a `const <provider>Adapter: AtsAdapter`.
3. Fill in `providerId`, `displayName`, `authType` (`'oauth2' | 'api_key' | 'basic'`).
4. Implement `beginAuth`, `completeAuth`, `testConnection`.
5. Implement the reads (`listRequisitions`, `listCandidatesForRequisition`, `getCandidate`). Return paginated `Page<T>` shapes; normalize the provider's response to our `Requisition` / `Candidate` shapes.
6. Implement `capabilities()`, `listStages`, `listTags`. Add `listEmailTemplates` if the provider has email templates.
7. Implement only the write methods (`advanceCandidateStage`, `rejectCandidate`, `addCandidateTag`, `sendCandidateMessage`, `addCandidateNote`) the provider supports. Omit the rest entirely — `capabilities()` already tells the UI not to offer them.
8. Register the adapter in `src/ats/registry.ts` by importing it and calling `registerAdapter(...)`.
9. Add a contract test that exercises every method against either a sandbox account or VCR-style recorded fixtures.
10. Document auth model, API base URL, rate limits, and supported writes at the top of the adapter file.

## Rebuild plan

Full phased plan is in `prompts/EXPO_REBUILD_PLAN.md`. Migration rationale (what was carried over from the legacy Node/Express app and what was discarded) is in `MIGRATION_NOTES.md`.

## License

See `LICENSE`.
