# Reusable short brief

Fill this in when requesting the next short. The background capture will be made from the real vendored Hugo/Three.js Atlas; no substitute geography or house artwork is generated.

```text
District (English / Telugu):
State:
New homes to highlight in this short:
Community total to show (only if verified):
Atlas username for private camera routing only (never displayed):
Opening hook:
Closing comment CTA:
Accent colour (hex):
Atlas time/light (golden / day / dusk / other):
Atlas season / weather:
Camera itinerary (overview → district → authored place → home → acre → pull-out):
Target authored place ids or coordinates:
Approximate shot lengths (must add to 40 sec):
Music / voice / sound requirements:
```

Supported code-driven camera actions and exact JSON fields are documented in `README.md`. To build a route around an existing follower home, use `resident` with their Atlas handle; to show their land, use `resident` with kind `acre` (or the `acre` action). The capture driver validates that the target handle/place/district exists in the vendored Atlas before it records.

## Current capture routine

1. `npm run atlas:check`; update upstream with `npm run atlas:update` if stale.
2. Run `npm run atlas:serve`.
3. Edit `video-data.json` from the brief; `atlasShots` must add to 40 seconds.
4. Run `npm run atlas:capture` using a WebGL2-capable Chrome/Chromium. The driver uses the real Atlas camera and house data, preloads each stop, and refuses a low-resolution capture.
5. `npm run render`; inspect `out/community-short.mp4` before posting.
