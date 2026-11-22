# Telugu States Atlas · Cinematic Instagram Shorts

This video workflow renders **the real Telugu States 3D Atlas**—its authored terrain, districts, roads, fields, vegetation, water and house models. It does not draw a substitute neighborhood or invent homes. The Atlas project is vendored at [`telugustates/Hugo-Project/`](telugustates/Hugo-Project/), from `srikanth1815101/telugustates` branch `main`; the current upstream pin is `3fa7b995f28db30f257a9bd00f3628a1e26450dd`.

## Required on every new video request: check upstream first

Run this before using the Atlas or making the next short:

```bash
npm run atlas:check
```

If it reports that `main` has moved, update the vendored project before filming:

```bash
npm run atlas:update
npm run atlas:check
```

The sync fetches only the upstream Hugo project, refuses to overwrite local edits, refreshes `UPSTREAM_COMMIT`, and reapplies the small video-camera bridge. The bridge exposes the Atlas's own overview, district inspection, authored-place, resident/acre and zoom controls to the capture driver; it adds **no** world geometry. A future video request should always check this pin before deciding which Atlas content/camera paths to use.

## Run the atlas and capture its real 3D world

Requires **Hugo Extended 0.131.0+**, Node.js 20.11+, npm, and a Chrome/Chromium build with WebGL2. Install Hugo Extended using the official Hugo installation instructions for your OS. The web project is self-contained/offline once Hugo is available.

```bash
npm install
npm run atlas:check
npm run lint:data
```

Start the map server in one terminal:

```bash
npm run atlas:serve
```

It serves the vendored project on `0.0.0.0:1313`; for browser automation outside this workspace, set `ATLAS_URL` to the reachable server URL. In another terminal, capture the authored world:

```bash
# If Chrome is not at the common system path:
CHROME_BIN=/path/to/chrome npm run atlas:capture
# Otherwise:
npm run atlas:capture
```

The driver opens the real Hugo app at **1080×1920**, applies the brief's Atlas quality/light/weather settings, and calls the project's own camera APIs for each `atlasShots` beat. It prewarms every destination, waits for the camera/terrain to settle, verifies that the live WebGL drawing buffer remains full-size/high tier and sustains 27 fps before recording (25 fps minimum during each shot), and records only the Atlas canvas as a local WebM. Capture privacy mode hides every physical username nameboard on every rendered frame, and the HTML search/address UI is never recorded; `@handles` in overlay text are automatically redacted. If WebGL2 fails, a referenced home/place is missing, or the engine falls back/downscales, capture stops rather than shipping a blurry or fabricated map. The capture is written under ignored `public/atlas-camera.webm`; `video-data.json` is updated to point at it.

Render the 40-second social video:

```bash
npx remotion browser ensure
npm run render
```

Remotion writes `out/community-short.mp4` at **1080×1920, 30 fps, 40 seconds**. Install Chromium once for Remotion; if the default download is blocked, supply its installed Chromium executable using the CLI's `--browser-executable` option. Audio is intentionally separate/muted so a licensed voiceover or platform sound can be added in the final social edit.

## What to edit for the next short

- `video-data.json` — district/state, totals, hook/CTA, visual settings and the camera itinerary.
- `atlasShots` — exact 40-second route through the real map. Supported actions: `overview`; `district` by Atlas district name/id; `place` by an authored place id plus `ground` / `mid` / `far` / `bank` / `grove` view; `resident` or `acre` by a published Atlas handle (for camera routing only); `coordinate` by longitude/latitude; or `zoom` by factor. Each shot has `durationSeconds`, optional Atlas `settings`, and an on-screen `title`; the total must equal 40 seconds.
- `atlasSettings` / `atlasQuality` — Atlas season, weather, lighting, and rendering quality. Capture specifically refuses a reduced-resolution renderer.
- `newHomes`, `totalFollowers`, `openingLine`, `closingLine`, `accentColor` — motion-graphics content. The template redacts `@handles` from all overlay copy.

`VIDEO-BRIEF.md` is the fill-in prompt for a future video request. If the desired route or reveal differs, update `atlasShots` and its camera timing in code; the backgrounds will still be frames from the real Atlas.

### Typical repeat workflow

1. `npm run atlas:check` (always check); if stale, `npm run atlas:update`.
2. Provide the district, actual Atlas handle(s), camera story beats, copy and display counts; update the brief.
3. Start `npm run atlas:serve`.
4. Run `npm run atlas:capture` and inspect its reported WebGL resolution, quality tier, houses and loaded terrain tiles.
5. Run `npm run render` and review the resulting MP4 before posting.

## Source project and provenance

The vendored directory contains the Hugo project only (about 4,974 tracked files, ~60 MiB); the full Android APK/build tree is not copied. The source's own content/docs describe which homes are authored/fictional and where terrain/geography is illustrative. The capture uses the app's bundled local data and assets, does not pull remote map tiles, and does not scrape Instagram. It records only the WebGL canvas (never the browser address/search UI); capture privacy mode also removes all physical username nameboards frame-by-frame. Atlas handles, if used internally to route to a resident/acre, are not written into on-screen graphics.

## Reference-video analysis

The two WhatsApp references supplied in the checkout were decoded locally frame-by-frame at their native 30 fps: **1,080 frames** from 36.117 seconds at 720×1280 and **600 frames** from 20.011 seconds at 478×850 (1,680 total). Half-second contact sheets plus downscaled grayscale frame-pair differences were used to identify pacing; extracted media stays out of Git.

- **36.1-second reference:** begins with a readable `DAY 1 / 0 RESIDENTS` over a green overhead map, slowly approaches a marked plot, drops into an oblique house/street view, then tracks the growing street and pulls out to a settlement CTA. Its frame-pair motion average was 1.22/255, with larger camera changes around 9–12 and 24–27 seconds.
- **20.0-second reference:** quickly reveals the district grid, accelerates its resident counter from 1 to hundreds, layers in follower/comment callouts, and then zooms back out. Its frame-pair motion average was 12.66/255, strongest in the 3–12-second reveal.
- **Our adaptation:** keeps the cinematic map flyover and clear end CTA, while prioritizing district exploration, a real virtual home and acre, private username lookup, seasons/day-night, and an invitation to build the Atlas together. Motion graphics sit over the actual 3D Atlas capture; viewer account handles are not shown.
