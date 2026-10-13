# Google Search Console

The verified Domain property is `ujeladea.org`. In Search Console > Sitemaps,
submit the full URL `https://www.ujeladea.org/sitemap.xml` after deployment.
Search Console must receive XML, not the React HTML shell or a 404 response.

## Published files

- `public/sitemap.xml` lists six public pages on the preferred `www` HTTPS origin:
  Home, Feed, Hymnal, Bible, Societies and Resources. Vite copies it to `dist`.
- `public/robots.txt` advertises that sitemap and excludes API crawling, while
  allowing the JavaScript, CSS and Bible/hymnal data needed to render the site.
- No account IDs, answers, drafts, login links, admin URLs or migration/query
  variants are submitted. Studies currently require a session, so they are not
  listed. Add a public study introduction before considering an indexed study URL.
- Dates are intentionally omitted: a deployment is not necessarily a meaningful
  update of page content. Do not invent `lastmod` values on every build.

## Direct entry and private routes

`vercel.json` rewrites only known application routes to `/index.html`, retaining
the requested URL. This fixes direct links that otherwise returned Vercel 404s.
Static files and `/api/` endpoints are not rewritten, and unknown public paths
still return 404. Keep the explicit route list in sync when adding React routes.

Account/access pages, studies, chat and the admin area receive
`X-Robots-Tag: noindex, follow`. They are not blocked in robots.txt so crawlers can
read that header. These indexing preferences are not security controls; existing
authentication and Supabase authorization remain responsible for private data.

The old `ujeladeast.vercel.app` installation remains independent and usable. Its
public files advertise the new sitemap, but there is no cross-origin redirect,
service-worker reset, cache removal, changed PWA identity or forced reinstall.
The worker excludes only `/sitemap.xml` and `/robots.txt` from its navigation
fallback, so installed browsers receive the actual XML/text instead of app HTML.
Offline navigation to the Bible and other application routes is unchanged.
Sitemap inclusion signals the preferred origin; Google still chooses canonical
URLs. This is not a full metadata, canonical-tag or server-rendering overhaul.

## Verify

1. Run `node --test tests/searchIndexing.test.mjs` and `npm run build`.
2. With Playwright available, run `node tests/searchIndexing.browser.mjs` against
   the existing dev server (`SEARCH_TEST_URL`, default `http://127.0.0.1:5177`).
   It parses the XML with DOMParser and checks that the build copied both files.
3. After deployment, set `SEARCH_TEST_DEPLOYED=1` and rerun the browser test. This
   verifies both production origins, the real HTTP status codes, noindex headers,
   service-worker cache policy and unchanged manifest identity. No login is used.
   `tests/pwaUpdate.browser.mjs` also checks XML/text navigation with a real
   installed worker and verifies that offline updates preserve stored data.
4. Submit the sitemap, then inspect `https://www.ujeladea.org/` in Search Console.
   Use the live test to inspect Google's rendered page before requesting indexing.

Google can take time to crawl/render a React site. A successful sitemap submission
does not guarantee indexing, ranking or immediate search results.

References:
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- https://vercel.com/docs/project-configuration/vercel-json
