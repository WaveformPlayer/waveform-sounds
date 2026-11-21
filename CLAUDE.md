# CLAUDE.md — @arraypress/waveform-sounds

A searchable, filterable list of sounds (sample-pack previews) built on
`@arraypress/waveform-player`. Peer of `waveform-playlist`, not a fork of it.

## Commands
- `npm test` — vitest + jsdom; `test/runtime/integration.test.js` runs against the
  REAL `@arraypress/waveform-player` (the published `^2.0.0`, a devDependency),
  the rest against the stand-in in `test/setup.js` (keep it faithful to the
  core and the browser: it resets the per-track `duration`/`downloadUrl`/
  `downloadName` on loadTrack like 2.0; a track switch fires NO onPause (the
  media load drops the queued pause); play() after a failed load rejects
  with no onPlay). `test/unit/render/golden.test.js` holds the server markup
  byte-identical to 2.2.0 (`test/fixtures/render-2.2.0.json`; regenerate only
  on purpose: `npm run build && node scripts/write-golden.mjs`, and say so in
  the CHANGELOG under "Changed (markup)"). `render-2.0.0.json` is markup from
  before 2.2 (rows carrying their sounds), which the runtime still adopts.
- `npm run build` — iife, min, esm, no-autoinit (esm), render (esm), css,
  then `build:types` (declarations + maps into `types/`, generated: never edit them).
  No CommonJS: `require()` of the ESM works on Node >=22.12 (`engines`).
- `npm run test:pack` — builds, packs this package + the installed core into a
  throwaway consumer: exports vs tarball, import + require() of all three
  entries, `/render` in plain Node (no DOM), types (bundler + nodenext), both
  script-tag builds in jsdom.
- `npm run typecheck` (strict `tsc`, must be 0 errors) · `npm run lint` (Biome).
- `npm run size` — currently ~19.7 KB JS / ~3.5 KB CSS gzipped.

## Architecture (`src/js/`) — by layer

```
index.ts · entry.ts · render-entry.ts    entry points (each is a build target)
types.ts  the public types (options, sounds, events)
core/     WaveformSounds.ts   the class: orchestration only
          element.ts          the <waveform-sounds> custom element (+ its definer)
          engine.ts           the engine player's options + per-sound peaks
          options.ts          DEFAULT_OPTIONS, data-* parsing, merge
data/     sounds.ts           pure: normalise, peaks codec, facets, filter, sort
          keys.ts             pure: enharmonic classes, merged key entries, key order
          url-state.ts        pure: filters <-> the address
          navigation.ts       pure: key targets, seek steps, paging, render chunks
render/   markup.ts           server-safe markup (toolbarPlan, renderMenu, renderRow…)
          options.ts          render options + validation (DOM-free)
          html.ts · icons.ts (the sprite) · strings.ts (+ row read-outs)
dom/      menus.ts            the dropdown controller (+ pure optionMatches/stepIndex)
          rows.ts             row DOM: read the JSON / legacy rows back, index, layoutRows
          draw.ts · colors.ts canvas drawing; colour + page-surface resolution
shared/   utils.ts            clamp, pointerFraction, isTyping, emit, hashString
```

**Layering is enforced by imports, keep it:** `data/` and `shared/` import
nothing local but each other; `render/` imports `data/`, `shared/` and
itself (never `core/` or `dom/` — the `/render` entry must stay DOM-free);
`dom/` may use `data/` and `render/`; `core/` uses everything. Anything that
can be a pure function lives in `data/` (or `shared/`) with a unit test.
Tests mirror the tree: `test/unit/<layer>/<module>.test.js` (pure modules
run in the node environment), `test/runtime/` for the class and the real
core. Every function and method carries a JSDoc block.

## Rules
- **Never a WaveformPlayer per row.** A pack can have 300 sounds. Rows are
  pictures (low-res peaks, drawn only when on screen); ONE engine plays.
- **Rows exist only while shown** (2.2): the page, or with paging off
  `RENDER_CHUNK` (50) more each time the last row nears the viewport
  (`_watchEnd`). `this.rows[i]` caches a row once made (detached when not
  shown); `_layout()` puts exactly the shown rows in the list
  (`layoutRows`, which never moves rows already in order). Anything that
  walks "the rows" must work from `_shown` / `this.sounds`, not the DOM,
  and per-sound state a row shows must be re-applied when it is rendered
  (`_adoptRow`: current, slider, `_failed`). The server renders the same
  first rows in the same (starting-sort) order, and every sound as JSON;
  a test asserts adopting it mutates no row.
- **One seek slider:** only the current row's `.ws-wave` has
  `role="slider"` / tabindex (`_paintWave`); the rest are `aria-hidden`.
- **Supplied peaks also stop the hidden engine decoding the file** (the core
  only decodes when it has no peaks). A sound without peaks borrows the
  engine's decoded ones after its first play.
- **The public types live in `src/js/types.ts`**; `types/` is generated from the
  source (`build:types`, `stripInternal`: mark internals `/** @internal */`). The
  four `waveform-sounds-*` wrappers derive their props from `WaveformSoundsOptions`
  (their drift tests parse it out of a .d.ts in `node_modules`: on 2.0 that is
  `types/types.d.ts`; the root `index.d.ts` they read up to 0.3.1 is gone). New option → `DEFAULT_OPTIONS`
  (core/options.ts; render-shaping ones in render/options.ts),
  `readDataOptions` (data-* form), `types.ts`, and every wrapper's allowlist.
- **TypeScript, ES2022, strict.** esbuild reads `tsconfig.json` (target ES2022:
  Chrome/Edge 111, Firefox 114, Safari 16.4), so the IIFE bundles start with
  "use strict" like the core's. Class fields are `declare`d (no emit).
- **The engine's options** (`core/engine.ts`): `playerOptions` pass through
  except `audioMode` (always `'self'`), `loop`/`showLoop` (always off — the
  list's Loop owns looping; the player's would stop `ended`) and the
  per-track `duration`/`downloadUrl`/`downloadName` (dropped; `engineTrack()`
  sends each sound's own to `loadTrack`). A new core option that changes
  playback or `ended` needs the same check.
- **Option precedence is the family's: data-* > constructor > default.**
- Logging prefix `[WaveformSounds]`. Events are `waveformsounds:*`, bubbling
  and composed, on the container; the instance is an `EventTarget` that also
  dispatches the plain name (`play`, …), like the core. Play/pause events
  follow the SOUND (`_announced`), not the `playing` flag.
- **Server markup is a contract** (the golden test): runtime-only state
  (roving tabindex, the slider, `aria-valuetext`, the empty-pack text) is
  set by the runtime, never added to `renderSounds` output. Icon symbol ids
  and row read-out ids carry the list's id prefix (`data-ws-sprite` tells
  the runtime which).
- `render/`, `data/` and `shared/` must stay DOM-free: their tests run in the node
  environment and fail if they touch `window`.

## Verified in a real browser (2026-10-06)
300 real clips: 50 rows shown, 18 canvases drawn (only on-screen ones), play,
progress, click-seek, ↓ audition, `/` + typing, the type menu (54 types).
Seeking on a host that ignores byte ranges works through the core's cache
path — but only if the host sends cache headers (Cloudflare does; a bare
test server doesn't, and the seek then restarts the sound).

## One player class per page
The engine is built from `window.WaveformPlayer` (or `playerClass`). If two
copies of the player load (an IIFE `<script>` and a bundled ESM import), the
second overwrites the global and `singlePlay` can't pause across them — the
static `currentlyPlaying` is per copy. Wrappers must load the player only
when `window.WaveformPlayer` is absent.

## Shared helpers come from @arraypress/text
`fold`, `words`, `matchesAll` (typo-tolerant search) and `escapeHtml` are
imported from `@arraypress/text` and BUNDLED into dist (a devDependency:
consumers install nothing). They need text **^2.2.0** (published
2026-10-07). Not reused on purpose:
the player's `formatTime` / `extractTitleFromUrl` (different output, and the
player has no DOM-free entry the server renderer could import).

## Cross-repo
Wrappers: `waveform-sounds-astro` / `-react` / `-svelte` / `-vue` — packages
16–20 in the `waveform-release` skill, which has this group's option-change
checklist.
Data: `waveform-gen --manifest` writes the `sounds.json` this reads.
