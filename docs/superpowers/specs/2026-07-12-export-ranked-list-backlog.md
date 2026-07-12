# Export Ranked List — Scoped Backlog Item

**Date scoped:** 2026-07-11 · **Status:** Queued (admin panel took priority).
Requirements below were confirmed with Douglas; pick up from "Approaches" when
this is next.

## What

Export a requisition's graded/ranked candidates out of the app for hiring-client
coordination — "the client-coordination endgame" of the grading feature.

## Confirmed requirements

- **Format:** PDF generated on-device, handed to the native share sheet
  (email/Slack/etc). No server piece, no hosted artifact. Likely
  `expo-print` (`printToFileAsync` from an HTML template) + `expo-sharing` —
  both need adding as deps.
- **Ranking source (team-shared connections):** rank by **my grade** when
  present; show a **team-average** column where teammates have graded
  (reuse `useVisibleGrades`).
- **Row content:** core fields only — rank, name, headline, overall grade
  (mine + team avg). Explicitly excluded from v1: per-skill detail grades,
  notes, contact info / resume links.
- **Plan gating:** none — free for every tier.

## Where it likely lives

An Export button in Grade mode (the deck-modes screen `swipe/[reqId]`), reusing
`useDeckCandidates({ includeSwiped: true })` + the grade sort util in
`src/features/grades/`.

## Not yet decided (resume brainstorm here)

- Exact PDF layout/branding; empty-state rules (ungraded candidates included at
  the bottom or omitted); filename convention; whether Candidates-tab exports
  (cross-requisition) are in scope.
