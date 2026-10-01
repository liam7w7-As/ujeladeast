# Public mobile experience

The public screens share a bottom navigation bar below 1280px, including guest
sessions, login and registration. More opens an accessible dialog for secondary
destinations and account actions. Admin keeps its existing navigation.

Authentication uses locally hosted Plus Jakarta Sans, local Lucide icons,
explicit labels, password visibility controls and reduced-motion preferences.
Registration has two steps and keeps the draft when navigating between them.
Existing avatars and profile storage remain unchanged. No SQL migration needed.

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
