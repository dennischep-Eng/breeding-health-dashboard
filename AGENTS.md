# Herdbook — agent notes

See PLAN.md for remaining milestones.

## Architecture
- `db/schema.ts` – Drizzle tables (animals, breeding_events, calving_events, health_events). Change schema → `npx drizzle-kit generate --name <name>`; migrations live in `netlify/database/migrations/` (never edit applied ones).
- `src/lib/herd.functions.ts` – all server functions (Zod-validated). Mutations are followed by `router.invalidate()` on the client.
- `src/lib/herd.ts` – client-safe types, labels, date helpers and `buildProfiles`/`buildSummary` (all dashboard KPIs/alerts derive from here).
- `src/lib/sample-herd.ts` – deterministic sample herd generator used by `loadSampleHerd` (not yet wired to UI).
- `src/routes/__root.tsx` – root loader fetches the whole herd; read via `useHerd()`/`useSummary()` in `src/lib/useHerd.ts`.
- `src/components/AppShell.tsx` – header/nav, toast, `useEntry()` context to open the entry sheet (key `N`).
- `src/components/EntrySheet.tsx` – `<dialog>` with four record forms.

## Conventions
- Dates are `YYYY-MM-DD` strings treated as UTC.
- Constants: gestation 283 d, VWP 50 d, preg check 28–45 d, dry-off 60 d before due.
- Recording a calving bumps dam lactation and sets status Milking; optionally registers heifer calf.
- Colours/fonts are theme tokens in `src/styles.css`.
