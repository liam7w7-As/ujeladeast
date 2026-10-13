# Domain transition pilot

Production origins remain independent:

- Old installed PWA: https://ujeladeast.vercel.app
- New canonical domain: https://www.ujeladea.org
- The apex ujeladea.org redirects to www in Vercel. Do not redirect the old vercel.app origin.

## Opt-in test

In the old installed PWA, accept the normal update, sign in as an administrator and select More > Probar cambio de dominio. This manual menu entry navigates within the same app and does not leave its storage container. Alternatively open https://ujeladeast.vercel.app/?traslado=piloto. The notice appears on Home only. It requires both the query parameter and a loaded admin profile matching the authenticated user. It is not automatically announced to admins or students. Any administrator can deliberately activate this pilot via that menu entry or link; this is not an allowlist for one particular account.

Development-only preview also accepts localhost or 127.0.0.1 on port 5177. Production builds do not enable this exception. No new environment variables, SQL, API keys or DNS changes are required.

Test in the actual old installed app when possible. If opening the link launches another browser, its audit only covers that browser's storage, not the installed app. Keep the old installation and repeat the check there before removing it. iOS/browser containers may have separate storage.

## Data review

The banner alone performs no favorite sync or storage audit. Opening its review mounts the existing favorite store, synchronizes the signed-in account's pending favorite queue, and retrieves server confirmation. Individual sync requests time out after 15 seconds, retain unacknowledged operations and allow retry. Guest favorites require explicit ownership confirmation and an import click; originals remain on the device. Other accounts' stored values and auth tokens are never read by the inventory.

The review reads this account's completed-study count from Supabase. It compares meaningful local drafts with the account's stored answers, optional journal content and remembered verses, or submitted recovery answers. Reads use the captured session JWT and explicit account filters; requests fetch only the relevant IDs in batches of 50, paginate to the end, and time out after 15 seconds. No study, journal, recovery or streak writes are made. Empty drafts containing only reading steps, whitespace or the recovery reading checkbox do not block departure. Copies matching confirmed server data also do not block. All local drafts, including empty and confirmed copies, remain untouched.

The review lists the lesson titles for genuinely unconfirmed or different local responses. Users may return to their studies or explicitly acknowledge that those drafts will remain in the old app, then open the new site separately. The status stays a warning, never an all-clear, when any responses are unconfirmed. This is not an import, upload, completion, deletion or recovery approval. Unknown/corrupt data or a failed server comparison cannot use this acknowledgment to bypass verification.

Invalid/unavailable local storage, pending favorites, failed queries/RPCs, offline status and unknown download metadata prevent assisted departure. Local storage is rechecked on focus/storage/connectivity changes, after same-tab favorite sync, every two seconds while the review is open, and synchronously before departure. Consent is tied to the exact local inventory and comparison displayed. Late responses from cancelled reviews cannot authorize a different inventory or account. Existing app-update guards also protect any in-flight save. Full Bible archives are never read.

Chapter bookmarks, reading position/preferences, offline Bible versions and hymnal caches do not migrate automatically. The user explicitly acknowledges this before opening the new site. This is a scoped readiness check, not proof that every browser, another open tab or every unsaved form has been reviewed.

## Arrival and rollback

The destination is fixed at https://www.ujeladea.org/?traslado=llegada and opens in a separate tab with noopener/noreferrer. There is no dynamic return URL, auth token, account identifier, draft or answer in the link. No forced navigation, service-worker removal, cache clearing or uninstall occurs.

The arrival notice offers the existing login flow with a return to the guide. The user signs in with the same account, checks studies/streak/favorites, installs from that origin, and downloads offline content again. A normal PWA update does not migrate its installed origin. Dismissing the pilot or simply continuing on the old origin keeps the old app usable. Only consider a broader rollout after the owner has checked Android/iOS and confirmed their account data.

## Verification

- `node --test tests/domainMigration.test.mjs`
- `node --test tests/domainStudyReview.test.mjs`
- `node tests/domainMigration.browser.mjs` (Playwright available via the bundled runtime; dev server on port 5177)
- Existing study completion, favorites, mobile and PWA update regression tests. Study button/status copy clarifies local drafts versus final account saves, without changing completion behavior.

Browser tests use mocked Supabase accounts only. Do not test with or mutate the owner's live answers/favorites automatically, and do not claim the real account has passed until the owner performs the pilot.
