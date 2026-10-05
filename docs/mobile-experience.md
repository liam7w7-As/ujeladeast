# Public mobile experience

The public screens share a bottom navigation bar below 1280px, including guest
sessions, login and registration. More opens an accessible dialog for secondary
destinations and account actions. Admin keeps its existing navigation.

Authentication uses locally hosted Plus Jakarta Sans, local Lucide icons,
explicit labels, password visibility controls and reduced-motion preferences.
Registration has two steps and keeps the draft when navigating between them.
Existing avatars and profile storage remain unchanged. No SQL migration needed.

## Installed app updates

Production builds use a waiting service worker and an explicit update dialog.
Each Vercel commit changes the embedded build ID; local builds use a timestamp.
An update becomes available after deployment and successful precaching, not at
the moment of the Git push. The installed app checks on focus, visibility,
reconnection and every minute while visible and online. Dismissed updates can
be offered again after five minutes or on the next opening.

Accepting activates the downloaded worker and reloads that tab. Other tabs ask
separately before reloading. Study sessions block activation/reload during a
save or when local draft storage has failed. Other unsaved forms should be
finished before accepting; the dialog warns about the reload. Local storage,
IndexedDB Bible downloads and the hymnal runtime cache are not cleared.

The first transition from the previous `autoUpdate` client can require closing
all app windows and browser tabs on this origin, then reopening after the new
worker has downloaded. That old client cannot display the new prompt until it
receives the updated code. No cache deletion, reinstall or SQL migration is
needed. Subsequent deployments use the dialog.

Run `node tests/pwaUpdate.browser.mjs` with Playwright and Chrome available.
It builds two production versions and serves them on a temporary local port,
then checks real service-worker activation, small/large popup layouts, delayed
updates, reload guards, independent tab consent, storage preservation and
offline activation/reload. Artifacts go to `test-results/pwa-update`.

## Password recovery configuration

In Supabase Auth URL Configuration, allow the production callback
`https://YOUR_PRODUCTION_HOST/recuperar?actualizar=1` in Redirect URLs and verify
the Site URL. Add preview/local origins only when needed for testing.
Email delivery and the real recovery-link round trip must be checked with a
test account in that environment; browser tests use mocked Supabase responses.

## Verification

Start Vite on port 5177, then run:

```sh
node --test tests/mobileExperience.test.mjs tests/feed.test.mjs tests/adminTools.test.mjs tests/studyTracking.test.mjs
node tests/mobileExperience.browser.mjs
node tests/feed.browser.mjs
```

Browser tests require Playwright and installed Chrome. Set `MOBILE_TEST_URL` and
`MOBILE_TEST_OUTPUT` to override the server and screenshots directory. Feed tests
use `FEED_TEST_URL` and `FEED_TEST_OUTPUT`. Run the admin regression suite with
`TRACKING_TEST_URL=http://127.0.0.1:5177 node tests/adminTools.browser.mjs` (adapt
environment-variable syntax to your shell).

The mobile suite covers guest navigation, small viewports, modal layering,
registration retries, login return destinations, password-recovery states and
authenticated chat spacing. All backend calls in these suites are mocked.
