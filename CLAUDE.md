# CLAUDE.md — @arraypress/waveform-sounds

A searchable, filterable list of sounds (sample-pack previews) built on
`@arraypress/waveform-player`. Peer of `waveform-playlist`, not a fork of it.

## Commands
- `npm test` — vitest + jsdom; `test/integration.test.js` runs against the
  REAL `@arraypress/waveform-player` (a devDependency from npm), the rest against
  the stand-in in `test/setup.js`.
- `npm run build` — iife, min, esm, cjs, no-autoinit (esm+cjs), render (esm+cjs), css,
  then `build:types` (declarations into `types/`, generated: never edit them).
- `npm run typecheck` (strict `tsc`, must be 0 errors) · `npm run lint` (Biome).
- `npm run size` — currently ~13.9 KB JS / ~2.6 KB CSS gzipped.

## Architecture (`src/js/`) — by layer

```
index.ts · entry.ts · render-entry.ts    entry points (each is a build target)
types.ts  the public types (options, sounds, events)
core/     WaveformSounds.ts   the class: orchestration only
          engine.ts           the engine player's options + per-sound peaks
          options.ts          DEFAULT_OPTIONS, data-* parsing, merge
data/     sounds.ts           pure: normalise, peaks codec, keys, facets, filter, sort
          url-state.ts        pure: filters <-> the address
          navigation.ts       pure: key targets, seek steps, paging
render/   markup.ts           server-safe markup (toolbarPlan, renderMenu, renderRow…)
          options.ts          render options + validation (DOM-free)
          html.ts · icons.ts · strings.ts
dom/      menus.ts            the dropdown controller (+ pure optionMatches/stepIndex)
          rows.ts             row DOM: read back, index, order, visible
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
- **TypeScript, same emitted code.** esbuild reads `tsconfig.esbuild.json`, not
  `tsconfig.json`: strict mode's `alwaysStrict` would add "use strict" to the
  IIFE/CJS bundles. Class fields are `declare`d (no emit).
- **Option precedence is the family's: data-* > constructor > default.**
- Logging prefix `[WaveformSounds]`. Events are `waveformsounds:*`, bubbling.
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
