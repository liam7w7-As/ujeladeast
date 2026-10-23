# Google sign-in activation

## What is implemented

- Google access alongside email/password on login and registration.
- Same-origin `/auth/callback`: both installed PWAs keep their own origin.
- Missing profiles are inserted with conflict-ignore, never replacing an existing row.
- First-time Google members complete their name, church, and avatar.
- `/cuenta` edits only name, church, and avatar, and supports explicit Google linking.
- Existing avatars remain available. Eight new optimized portraits are additional choices.
- No study, streak, favorite, or download records are modified by these flows.
- Public Auth settings are checked before redirecting, so a disabled Google provider
  produces a recoverable message instead of a broken external page.

No database migration is needed for the current project. Read-only inspection on
2026-10-23 confirmed nullable profile fields, a default `role = 'user'`, and no
`auth.users` trigger requiring the old registration metadata. New profile inserts
omit `role`; updates whitelist only the three profile fields above.

## 1. Google Auth Platform

Use a Google Cloud project owned by UJELADEA. Configure Branding, Audience, and
Data Access. For the first test, leave the audience in testing and add the owner's
Google account as a test user. Use the same verified email as the existing account.

Create a **Web application** OAuth client.

Authorized JavaScript origins:

```text
https://www.ujeladea.org
https://ujeladeast.vercel.app
```

Add an explicit localhost origin only for local OAuth testing.

Authorized redirect URI (this belongs to Supabase, not the frontend):

```text
https://rmarlnxswonazmewmldk.supabase.co/auth/v1/callback
```

Request only `openid`, `userinfo.email`, and `userinfo.profile`. Do not add Gmail,
Drive, Calendar, offline Google access, or other unrelated scopes.

Save the Client ID and Client Secret directly in the Supabase Google provider.
Never put the secret in source code, a `VITE_` variable, screenshots, or chat.
Branding may require additional verified-domain/privacy-policy information;
complete Google's requirements before making the provider public.

## 2. Supabase dashboard

In Authentication > Sign In / Providers > Google, enable Google and enter the
Client ID and Client Secret. Keep nonce checking and email verification enabled.

Under Authentication > URL Configuration, keep the current production Site URL
and **add** these exact Redirect URLs without removing any existing entries:

```text
https://www.ujeladea.org/auth/callback
https://ujeladeast.vercel.app/auth/callback
```

For local testing, also allow the exact local callback shown by the dev server.
Do not replace the Site URL with the callback URL or add broad production wildcards.

Enable **Manual Identity Linking** for the optional "Vincular Google" account action.
This permits a signed-in member to add Google with a different email to their
current user ID. An identity already owned by another account must not be merged
automatically. The app reports the conflict without changing either profile.

No new Vercel secret or OpenRouter setting is needed. Existing Supabase public
client settings are reused. No provider configuration has been changed by this
implementation; owner activation is still required.

## Existing permission issue awaiting approval

Read-only inspection also found that existing profile policies allow owners to
insert/update their own `role` column. The new UI never sends this field, but UI
validation does not fix database authorization. This pre-existing permission
needs a separate, approved SQL correction that preserves administrator role
management. No permission, role, or production schema was changed here. Resolve
this before a broad OAuth rollout; approval was requested separately.

## 3. Owner acceptance test before public rollout

1. Note the current user ID and existing streak, progress, and favorites.
2. Sign in with Google using the same verified email. Confirm the user ID and all
   data are unchanged, and a complete profile is not sent through onboarding.
3. Test a new Google account: complete church/avatar once, reload, and confirm the
   profile persists without changing roles or creating duplicate study records.
4. From an existing email account, use Mi cuenta > Vincular Google. Confirm the
   user ID stays the same. Also test cancellation and an identity conflict.
5. Repeat in the old installed PWA and the new one on Android and iPhone. Some
   OS/browser combinations return in a browser rather than the standalone window;
   check real-device session behavior before announcing universal support.
6. Confirm email/password, password recovery, offline reading, and the update
   prompt still work. Google sign-in itself requires internet.
7. After approval, publish the Google OAuth audience to allow all intended users.

## Automated verification

```text
node --test tests/googleAuth.test.mjs tests/feed.test.mjs
node tests/googleAuth.browser.mjs
```

Browser tests mock Supabase and Google. They never authenticate real people or
write production records. Live Google consent and real-device PWA behavior require
the owner test after configuration.

## Sources and supplied assets

- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://supabase.com/docs/guides/auth/auth-identity-linking
- https://supabase.com/docs/guides/auth/redirect-urls
- https://github.com/supabase/auth/blob/master/openapi.yaml (`GET /settings`)
- `C:/Users/UnseR/Desktop/assets/user-*.jpg`: optimized to 256px WebP avatars.
- `C:/Users/UnseR/Desktop/assets/ChatBc.png`: chat welcome illustration.

The remaining supplied product/mockup images were not inserted into unrelated
Bible or community content. Original files in the shared assets folder are intact.
