# Optional domain transition

Production origins remain independent:

- Old installed PWA: https://ujeladeast.vercel.app
- New canonical domain: https://www.ujeladea.org
- The apex ujeladea.org redirects to www in Vercel. Do not redirect the old vercel.app origin.

## Public notice

After the old installed PWA accepts the normal update, Home automatically shows the notice to members, administrators and guests on https://ujeladeast.vercel.app. No special role, environment variable or query parameter is needed. The notice is inline, not a blocking dialog. Staying on the old origin and keeping its installation are fully supported; moving and installing the new origin are optional.

"Mas tarde" remembers dismissal in sessionStorage for the current account (or guest), including reloads and returning to Home. Only a small "Ver aviso de ujeladea.org" link remains. It and More > Nuevo dominio: ujeladea.org reopen the notice at /?traslado=revisar inside the same app. Old /?traslado=piloto links still work. If sessionStorage is blocked, the current visit can still dismiss the notice. No study/favorite data is changed by dismissing it.

Guests sign in on the old origin before reviewing their data. Login returns to /?traslado=revisar; the review only opens after an explicit click on "Revisar mis datos". Reviews are tied to the current authenticated account, not an admin role. The public notice does not appear on the new origin; the separate arrival guide remains available through /?traslado=llegada.

Development-only preview accepts localhost or 127.0.0.1 on port 5177 with ?traslado=revisar or the legacy ?traslado=piloto. Production builds do not enable this exception. No new environment variables, SQL, API keys or DNS changes are required.

Test in the actual old installed app when possible. If opening the link launches another browser, its audit only covers that browser's storage, not the installed app. Keep the old installation and repeat the check there before removing it. iOS/browser containers may have separate storage.

## Data review

The banner alone performs no favorite sync or storage audit. Opening its review mounts the existing favorite store, synchronizes the signed-in account's pending favorite queue, and retrieves server confirmation. Individual sync requests time out after 15 seconds, retain unacknowledged operations and allow retry. Guest favorites require explicit ownership confirmation and an import click; originals remain on the device. Other accounts' stored values and auth tokens are never read by the inventory.

The review reads this account's completed-study count from Supabase. It compares meaningful local drafts with the account's stored answers, optional journal content and remembered verses, or submitted recovery answers. Reads use the captured session JWT and explicit account filters; requests fetch only the relevant IDs in batches of 50, paginate to the end, and time out after 15 seconds. No study, journal, recovery or streak writes are made. Empty drafts containing only reading steps, whitespace or the recovery reading checkbox do not block departure. Copies matching confirmed server data also do not block. All local drafts, including empty and confirmed copies, remain untouched.

The review lists the lesson titles for genuinely unconfirmed or different local responses. Users may return to their studies or explicitly acknowledge that those drafts will remain in the old app, then open the new site separately. The status stays a warning, never an all-clear, when any responses are unconfirmed. This is not an import, upload, completion, deletion or recovery approval. Unknown/corrupt data or a failed server comparison cannot use this acknowledgment to bypass verification.

Invalid/unavailable local storage, pending favorites, failed queries/RPCs, offline status and unknown download metadata prevent assisted departure. Local storage is rechecked on focus/storage/connectivity changes, after same-tab favorite sync, every two seconds while the review is open, and synchronously before departure. Consent is tied to the exact local inventory and comparison displayed. Late responses from cancelled reviews cannot authorize a different inventory or account. Existing app-update guards also protect any in-flight save. Full Bible archives are never read.

Chapter bookmarks, reading position/preferences, offline Bible versions and hymnal caches do not migrate automatically. The user explicitly acknowledges this before opening the new site. This is a scoped readiness check, not proof that every browser, another open tab or every unsaved form has been reviewed.

## Arrival and rollback

The destination is fixed at https://www.ujeladea.org/?traslado=llegada and opens in a separate tab with noopener/noreferrer. There is no dynamic return URL, auth token, account identifier, draft or answer in the link. No forced navigation, service-worker removal, cache clearing or uninstall occurs.

The arrival notice offers the existing login flow with a return to the guide. The user signs in with the same account, checks studies/streak/favorites, optionally installs from that origin, and downloads offline content again if needed. A normal PWA update does not migrate its installed origin. Dismissing the notice or simply continuing on the old origin keeps the old app usable. Do not add an automatic redirect, an expiry for the old app, or automatic cache cleanup as part of this rollout.

## Verification

- `node --test tests/domainMigration.test.mjs`
- `node --test tests/domainStudyReview.test.mjs`
- `node tests/domainMigration.browser.mjs` (Playwright available via the bundled runtime; dev server on port 5177)
- Existing study completion, favorites, mobile and PWA update regression tests. Study button/status copy clarifies local drafts versus final account saves, without changing completion behavior.

Browser tests use mocked Supabase accounts only, including an ordinary member for the full data-review flow. Do not test with or mutate live answers/favorites automatically, and do not claim a real account has passed until its owner performs the review.
