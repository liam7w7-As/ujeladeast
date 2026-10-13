# Google Search Console

The verified Domain property is `ujeladea.org`. In Search Console > Sitemaps,
submit the full URL `https://www.ujeladea.org/sitemap.xml` after deployment.
Search Console must receive XML, not the React HTML shell or a 404 response.

## Published files

- `public/sitemap.xml` is an index on the preferred `www` HTTPS origin. Its URL
  stays unchanged for the existing Search Console submission.
- `/sitemap-paginas.xml` is generated from `src/lib/siteContent.js` and lists
  eight public pages, including About and the public Bible study introduction.
- `/sitemap-publicaciones.xml` lists current public posts using anonymous
  Supabase permissions and paginated reads. No login/session is used, and no
  service-role key is accepted. Unavailable upstream data returns 503, not an
  empty successful sitemap. Split into numbered sitemaps before 50,000 posts.
- `public/robots.txt` advertises that sitemap and excludes API crawling, while
  allowing the JavaScript, CSS and Bible/hymnal data needed to render the site.
- No account IDs, answers, drafts, login links, admin URLs or migration/query
  variants are submitted. `/estudios` remains private/noindex; the separate
  `/estudio-biblico` introduction contains no user progress or answers.
- Dates are intentionally omitted: a deployment is not necessarily a meaningful
  update of page content. Do not invent `lastmod` values on every build.

## Direct entry and private routes

`vercel.json` rewrites public routes to their generated HTML documents and
account routes to `/app.html`, retaining the requested URL.
Static files and `/api/` endpoints are not rewritten, and unknown public paths
still return 404. Keep the explicit route list in sync when adding React routes.

Account/access pages, studies, chat and the admin area receive
`X-Robots-Tag: noindex, follow`. They are not blocked in robots.txt so crawlers can
read that header. These indexing preferences are not security controls; existing
authentication and Supabase authorization remain responsible for private data.

The old `ujeladeast.vercel.app` installation remains independent and usable. Its
public files advertise the new sitemap, but there is no cross-origin redirect,
service-worker reset, cache removal, changed PWA identity or forced reinstall.
The worker excludes all three sitemap paths and `/robots.txt` from its navigation
fallback, so installed browsers receive the actual XML/text instead of app HTML.
Offline navigation to the Bible and other application routes is unchanged.
Every public page declares its canonical URL on the new origin. Google still
chooses canonical URLs; this does not redirect an old installed PWA.

## Content and rendering

`src/lib/siteContent.js` centralizes the approved identity, UJELAB dependency,
INELA relationship, 2026 motto, social links and public metadata. Historical dates
and a canonical Facebook profile await owner verification. Update this source
and deploy to change both visible institutional text and metadata. This release
does not add an institutional editor to Supabase/admin.

`scripts/build-seo.mjs` is a Vite plugin: it generates HTML before Workbox hashes
the files. Home/About/study-introduction share their visible institutional text
with React. Tool pages have distinct initial descriptions and links; their actual
interactive Bible/hymnal/catalog content continues to render in React.

`/publicaciones/:uuid` renders the full public post without JavaScript, including
escaped text, real author/date, canonical, social metadata and SocialMediaPosting
JSON-LD. It does not claim every community post is a reviewed institutional article.
Its JSON endpoint serves the same anonymous allowlisted data during SPA navigation.
Missing or withdrawn records return 404/noindex; transient failures return 503.
Responses can remain in the CDN for up to 60 seconds after a change or removal.
Existing `/feed?post=...` links continue to open the conversation. New share links
use the canonical public page. No private WhatsApp group, account records, tokens,
study answers, drafts, streaks or comments are included in the server document.

The server uses the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
production variables (or the explicit SUPABASE_URL/SUPABASE_ANON_KEY equivalents).
Both legacy anon JWTs and current publishable keys work. No new secret or SQL is
required. Anonymous RLS remains authoritative; never bypass it with elevated keys.

The social preview is `public/social/ujeladea-v1.png` (1200 x 630), generated with
the existing logo/font by `scripts/generate-social-card.mjs` using Playwright.
Use a new image filename after changing its artwork to avoid social cache reuse.

## Verify

1. Run `node --test tests/*.test.mjs` and `npm run build`.
2. With Playwright available, run `node tests/searchIndexing.browser.mjs` against
   the existing dev server (`SEARCH_TEST_URL`, default `http://127.0.0.1:5177`).
   It parses XML with DOMParser and checks canonical metadata and structured data.
   Run `node tests/seo.browser.mjs` for no-JavaScript HTML, 404/503 behavior,
   client navigation metadata cleanup and mobile/desktop screenshot checks.
3. After deployment, set `SEARCH_TEST_DEPLOYED=1` and rerun the browser test. This
   verifies both production origins, the real HTTP status codes, noindex headers,
   service-worker cache policy and unchanged manifest identity. No login is used.
   `tests/pwaUpdate.browser.mjs` also checks XML/text navigation with a real
   installed worker and verifies that offline updates preserve stored data.
4. Keep the same sitemap submission, then inspect `https://www.ujeladea.org/`,
   `/nosotros` and a real publication in Search Console.
   Use the live test to inspect Google's rendered page before requesting indexing.

Google can take time to crawl/render a React site. A successful sitemap submission
does not guarantee indexing, ranking or immediate search results.

References:
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- https://vercel.com/docs/project-configuration/vercel-json
