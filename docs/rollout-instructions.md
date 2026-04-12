# Finish the Contact Dedup + Enrichment Rollout

Hand this file to Claude Code CLI (or any engineer). It picks up from commit `3d3fa72` on branch `claude/contact-dedup-enrichment-quzUo` and drives the feature to production.

---

## Context (what's already done)

A previous session landed the full Phase 0 + Phase 1 + Phase 2 infrastructure on branch `claude/contact-dedup-enrichment-quzUo`. Read the commit message on `3d3fa72` and `docs/screenshot-to-contact.md` before starting — they're the spec.

Scope you are picking up:
- **Deploy + configure** the migration, edge functions, and secrets.
- **Regenerate Supabase types**.
- **Build + host the iOS Apple Shortcut**.
- **Add an in-app "Set up on iPhone" button** and an Android PWA-install prompt.
- **Smoke-test on device**.
- **Phase 3**: merge-conflict side-by-side UI (optional, follow-up).

Do not re-implement any Phase 0/1/2 logic — it already exists. Only touch code when a step below says to.

---

## Task 1 — Run the migration

```bash
# From the repo root, with the Supabase CLI linked to the prod project:
supabase db push
```

This applies `supabase/migrations/20260412000001_add_contact_dedup_enrichment.sql`, which:
- Adds `enrichment_status`, `enrichment_last_attempt_at`, `enrichment_failure_reason`, `needs_review` columns to `talent_contacts`.
- Extends the `source` enum (adds `screenshot_linkedin`, `screenshot_instagram`, `screenshot_contacts`, `voice`, `photo`, `instagram`, `phone_contacts`).
- Creates `talent_contact_identities` with a unique `(user_id, kind, value_normalized)` index.
- Creates `talent_contact_merges` audit log.
- Installs `sync_contact_identities` trigger.
- Backfills identities from existing `talent_contacts` rows.

**Verify** after push:
```sql
-- Should return > 0 if you had any existing contacts with emails/phones/linkedin.
select count(*) from talent_contact_identities;

-- Should return 0 (nothing flagged yet).
select count(*) from talent_contacts where needs_review = true or enrichment_status = 'failed';
```

If `supabase db push` refuses because the project has drift, apply the single SQL file via the SQL Editor in the Supabase dashboard instead. Don't try to rewrite or skip sections.

---

## Task 2 — Deploy the two new edge functions

```bash
supabase functions deploy resolve-contact
supabase functions deploy parse-screenshot
```

Both live in `supabase/functions/`. They share helpers from `supabase/functions/_shared/identity.ts` and `supabase/functions/_shared/compliance.ts`. The deploy command bundles shared files automatically.

**Verify**:
```bash
# Replace <JWT> with a real user's access token from the app.
curl -X POST "https://<project>.supabase.co/functions/v1/resolve-contact" \
  -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
# Expect: {"matched": null, "all_matches": [], "identities_checked": 1}
```

---

## Task 3 — Configure the vision-model secret

`parse-screenshot` calls either Anthropic (preferred) or OpenAI. Set **one**:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# OR
supabase secrets set OPENAI_API_KEY=sk-...
```

Model pinned in code:
- Anthropic path: `claude-haiku-4-5-20251001`
- OpenAI path: `gpt-4o-mini`

If the user doesn't have either key, the screenshot flow will return a clean error ("No vision model API key configured"). The rest of the app is unaffected.

---

## Task 4 — Regenerate Supabase types

The previous session hand-patched `src/integrations/supabase/types.ts` to add the new columns so the build stayed green. Replace with the canonical generated types now that the migration has run:

```bash
supabase gen types typescript --project-id <project-id> > src/integrations/supabase/types.ts
```

**Verify**: run `npx tsc --noEmit` — it must pass. If it breaks, something is off with the migration; don't patch the types back, fix the DB.

Commit the regenerated file with message: `chore: regenerate supabase types after dedup/enrichment migration`.

---

## Task 5 — Build and host the Apple Shortcut

Follow `docs/screenshot-to-contact.md` § "iOS (Apple Shortcut)" precisely. Four Shortcut actions:

1. **Get Input From** → Share Sheet → Images only.
2. **Base64 Encode** the input image.
3. **Get Contents of URL** → POST to `https://<supabase-url>/functions/v1/parse-screenshot`
   - Header: `Authorization: Bearer <user_access_token>` (stored as a Text variable in the Shortcut at install time)
   - Header: `Content-Type: application/json`
   - Body (JSON): `{"image": <base64>, "mime": "image/jpeg"}`
4. **Open URL**: `https://circle.fractionl.ai/share-contact?prefill=<urlencoded-JSON-of-response.parsed>`

Build steps:
1. On a Mac or iPhone, open Shortcuts.app → new Shortcut named **"Add to Circle"**.
2. Configure the 4 actions above. Enable "Show in Share Sheet" → accept Images.
3. Test with a LinkedIn screenshot — should end up on `/share-contact` in Safari.
4. Share → **iCloud Link** → copy the generated `icloud.com/shortcuts/<uuid>` URL.
5. Host that URL by:
   - **Option A (simplest)**: just use the iCloud link directly. Slight downside: iCloud sometimes deprecates links.
   - **Option B (recommended)**: export the `.shortcut` file (Files app → Shortcuts → share → Save to Files), commit it to the repo at `public/shortcuts/add-from-circle.shortcut`, and serve it from `https://circle.fractionl.ai/shortcuts/add-from-circle.shortcut`.

Update `docs/screenshot-to-contact.md` with the final hosted URL.

### Server-side hydration (required for this flow to work)

Currently `src/pages/ShareContact.tsx` reads a `parse_id` query param and calls `parse-screenshot` with it, but the function returns an empty object in that mode (see `index.ts` line with `if (body.parse_id)`). You have two options:

**Option A (recommended) — inline prefill via URL param.** Change the Shortcut step 4 to pass the parsed JSON inline: `?prefill=<urlencoded-JSON>`. Update `ShareContact.tsx` `useEffect` to read `prefill`, JSON.parse it, and jump straight to the `confirm` state. This is the simplest and requires no new DB.

**Option B — server-stored parse IDs.** Add a `screenshot_parses` table (id uuid, user_id, parsed jsonb, created_at, expires_at + RLS). Have `parse-screenshot` persist the parse and return `{parse_id}`. Have it also support `GET` by `parse_id`. More moving parts; skip unless Option A hits URL-length limits.

Implement Option A unless you have a reason not to.

---

## Task 6 — "Set up on iPhone" button in Settings

Add a button to the Settings screen (`src/components/screens/SettingsScreen.tsx` — grep for the existing rows pattern).

- Show on iOS only: `navigator.userAgent.match(/iPhone|iPad|iPod/)` or a `useIsIOS()` helper if one exists; check `src/hooks/` first.
- Label: **"Add from Screenshot (iOS)"** with description **"Install the Shortcut to add contacts from screenshots"**.
- On tap: `window.open(<shortcut URL from Task 5>, '_blank')`.
- Add a matching **"Install Circle as App"** row for Android users: show only when `'beforeinstallprompt'` has fired. Capture the event in `src/utils/registerServiceWorker.ts` or a new `src/hooks/useInstallPrompt.ts`, expose `{canInstall, install}`. On tap, call `deferredPrompt.prompt()`.

Don't build a full install-prompt framework — just the one button, wired to the browser's deferred prompt. Five-ten lines of hook, five lines of Settings row.

---

## Task 7 — Smoke-test on device

You need a physical Android phone and an iPhone to fully verify. If you only have one, do that platform.

**Android path:**
1. On Android Chrome, visit the app. Chrome should offer "Add to Home Screen" once the service worker is registered and the manifest is served.
2. Install. Open the installed app at least once (establishes share target registration).
3. Go to LinkedIn mobile site → any profile → take a screenshot.
4. Open the screenshot in the Gallery app → Share → **Circle** should appear in the share sheet.
5. Tap Circle → expect `/share-contact` to open with the parsed profile fields pre-filled.
6. Edit / Save → contact should appear in Circle with `source = screenshot_linkedin` and an amber dot on the avatar if enrichment failed.

**iOS path:**
1. On the iPhone, open the Shortcut install URL from Task 5 → add to Shortcuts.
2. On the first run, the Shortcut should prompt for the Supabase access token. Enter it (pull from Circle's Settings → Developer section, or add a "Copy my access token" button there).
3. Take a LinkedIn screenshot → Share → **"Add to Circle"** Shortcut.
4. Safari should open `/share-contact?prefill=...` with fields pre-filled.
5. Save → contact appears with `source = screenshot_linkedin`.

**Dedup test (both platforms):**
1. Add a contact manually with email `test@foo.com`.
2. Take a screenshot of a LinkedIn profile and paste `test@foo.com` into a LinkedIn post (or use a profile where the contact email matches).
3. Share into Circle. On Save, expect a "Merged into <name>" toast — not a new row.

**Enrichment-warning test:**
1. Open `LinkedInImportSheet`, type "zzzzzunknownname" (gibberish), hit Look Up Profile.
2. Expect: confirm card with amber banner saying lookup didn't find a match; Save still works.
3. After save: amber dot on the contact row, amber chip on the edit form, count in the home "N contacts need review" banner.

---

## Task 8 (optional) — Phase 3: Merge-conflict side-by-side UI

Deferred from the previous session. The scaffolding is already in the DB (`talent_contact_merges` table). Today's merge in `useContactIntake.ts::mergeInto` only fills empty fields — so no destructive overwrites occur. You'd add this if you want users to be able to *update* fields on an existing contact from the merge flow (e.g. "the new LinkedIn URL is correct, overwrite the old one").

Scope:
1. New component `src/components/talent/MergeConflictDialog.tsx`:
   - Takes `existing: TalentContactWithSkills` and `incoming: TalentContactInsert`.
   - Renders a two-column diff: existing value vs. incoming value for every field where both are set *and* different.
   - Radio per conflicting field, **default = keep existing**.
   - "Apply" button.
2. Extend `useContactIntake.ts::mergeInto` to accept `fieldOverrides: Record<string, 'existing' | 'incoming'>`. For each conflicting field, use the winner; for empty-existing fields, fill as today.
3. Before applying, snapshot both contacts into `talent_contact_merges` (`snapshot_winner_before`, `snapshot_loser`, `field_choices`). After applying, snapshot `snapshot_winner_after`.
4. In `BulkImportReview`, when the user clicks "Merge" *and* there are conflicting fields, open `MergeConflictDialog` first. Otherwise merge silently.
5. Add an "Undo merge" button to the contact detail page that reads from `talent_contact_merges` (newest row for this contact, not yet reversed) and reverts both snapshots + clears `reversed_at`.

Keep this PR focused; no other changes. Should be ~250 lines.

---

## Task 9 — Final checks

```bash
npx tsc --noEmit       # must pass
npm run build          # must pass
npx vitest run         # all tests must pass
```

Push. Do **not** open a PR unless the user explicitly asks for one.

---

## Files to read before you start

- `docs/screenshot-to-contact.md` — architecture of the Phase 2 flow
- `src/hooks/useContactIntake.ts` — the pipeline every entry point uses
- `src/hooks/useDuplicateDetection.ts` — match keys + normalization (client)
- `supabase/functions/_shared/identity.ts` — match keys (server)
- `supabase/migrations/20260412000001_add_contact_dedup_enrichment.sql` — schema
- `src/pages/ShareContact.tsx` — the `/share-contact` route
- `supabase/functions/parse-screenshot/index.ts` — vision parser
- `supabase/functions/resolve-contact/index.ts` — server-side dedup
- Git log of `3d3fa72` — what changed and why

## Files you will modify

- `src/integrations/supabase/types.ts` (regenerate, Task 4)
- `src/components/screens/SettingsScreen.tsx` (Task 6)
- Possibly `src/pages/ShareContact.tsx` + `supabase/functions/parse-screenshot/index.ts` (Task 5 Option A)
- New file `src/hooks/useInstallPrompt.ts` (Task 6)
- `docs/screenshot-to-contact.md` (final URL in Task 5)
- New files for Task 8 if you do it

## Branch policy

Keep working on `claude/contact-dedup-enrichment-quzUo` unless the user tells you to branch off. Push with `git push -u origin claude/contact-dedup-enrichment-quzUo`.

Never push to main. Never open a PR without explicit instruction.
