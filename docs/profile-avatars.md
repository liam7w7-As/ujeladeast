# Profile avatars

Generated with the built-in ImageGen tool. Final local assets:

- `public/avatars/hombre.webp`
- `public/avatars/mujer.webp`

Both are optimized 320x320 WebP images. Selection is stored in Supabase Auth
metadata (`gender`, `avatar_url`) and copied to the existing `profiles.avatar_url`
field after authentication. Existing custom avatars are preserved. Accounts
without a choice show a neutral profile icon; gender is never inferred.

## Generation prompts

Male: Use case: stylized-concept. Asset type: square profile avatar for a young-adult community app. Create one polished, friendly 3D clay-style illustrated portrait of a young adult man, age around 22, medium warm brown skin, short softly wavy black hair, expressive brown eyes, gentle confident smile, clean shaven, wearing a simple teal crewneck sweatshirt. Head and upper shoulders only, centered symmetrical front-facing composition, all hair comfortably inside the square, portrait fills 85 percent of frame, clear facial features readable at 40px. Solid light desaturated mint backdrop, soft natural studio light, sophisticated playful matte materials, crisp high quality. No lettering, no objects, no logos, no border, no photo realism. One portrait only.

Female: Matching young-adult woman portrait with warm brown skin, shoulder-length dark wavy hair, a muted coral crewneck and a light desaturated sky-blue background. Same square, centered, matte 3D clay style, face legibility and no-text constraints.

## Checks

`node --test tests/feed.test.mjs`

`node tests/feed.browser.mjs` uses Playwright, installed Chrome and a local Vite
server on port 5176 (override with `FEED_TEST_URL`). It mocks Supabase, never writes
production records, and saves screenshots to `FEED_TEST_OUTPUT` or `test-results`.
