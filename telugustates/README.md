# Vendored Telugu States Hugo project

- Upstream: `https://github.com/srikanth1815101/telugustates.git`, branch `main`, path `Hugo-Project/`.
- Exact source pin: [`UPSTREAM_COMMIT`](UPSTREAM_COMMIT).
- Use `npm run atlas:check` before every video request. If upstream main moved, run `npm run atlas:update`; sync is sparse and guarded against local edits.
- Run this Hugo project with `npm run atlas:serve` from the parent workspace. Requires Hugo Extended 0.131.0+.

The local video adapter is applied to `Hugo-Project/static/js/public-home.js` and `static/js/world.js`. `scripts/apply-atlas-video-hook.mjs` adds it after each upstream sync. It exposes the project's own camera, district, place and resident/acre APIs to the capture script and hides username nameboards only during privacy-mode recording; it creates no world geometry/assets.
