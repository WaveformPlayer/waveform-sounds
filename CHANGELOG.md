# Changelog

All notable changes to `@arraypress/waveform-sounds` are documented here. The
format is based on [Keep a Changelog](https://keepachangelog.com/) and this
project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

A lighter, quieter list: rows exist only while shown, icons are defined
once, a screen reader hears one seek slider and whole sentences, and
enharmonic keys are one key. **The server-rendered markup changes** (see
below): nobody depends on 2.x markup yet, so this ships in a minor. Pass
the same render options to the server and the runtime as before; markup
rendered by 2.0 / 2.1 is still adopted.

### Changed (markup)

- **`renderSounds` renders only the rows the list starts with** — the
  first page, or with `pageSize: 0` the first 50 — in its starting order
  (the first sort offered), and carries EVERY sound once as JSON
  (`<script type="application/json" data-ws-sounds>`). Rows past the page
  are no longer in the markup as `hidden` rows, and a row no longer carries
  its sound as `data-url` / `data-title` / `data-type` / `data-bpm` /
  `data-key` / `data-duration` / `data-tags` / `data-peaks` /
  `data-waveform` / `data-download` / `data-loop` / `data-ws-id`: only
  `data-ws-index`. 1000 sounds, paging off: 1.37 MB → 337 KB of markup
  (142 → 91 KB gzipped); 300 sounds, default paging: 429 → 147 KB.
- **Icons are one sprite per list**: a hidden `<svg class="ws-sprite"
  data-ws-sprite="<idPrefix>">` with a `<symbol id="<idPrefix>-i-<name>">`
  for each icon the list uses, first in the markup; every icon is
  `<svg class="ws-icon …"><use href="#…"/></svg>` (the classes are
  unchanged, so CSS that styles `.ws-icon-play` still does). Still
  `currentColor`, still drawn under forced colours.
- **A row reads as a sentence**: its cells are `aria-hidden`, and a
  visually hidden `<span class="ws-sr" id="<idPrefix>-d<index>">` says
  "Bass loops, 130 BPM, key B minor, 0:07, Loop" (was "Bass loops 130 Bm
  0:07"); the play button is `aria-describedby` it. The loop mark is
  `aria-hidden` (its "Loop" is in the sentence).
- **No waveform is a slider in the markup**: `.ws-wave` is
  `aria-hidden="true"` with no role or tabindex; the runtime makes the
  current row's the seek slider (and only that one).
- The key menu's options carry `data-alt` (a merged key's other
  spellings) where there are any.
- The golden test now holds 2.2.0's markup (`test/fixtures/render-2.2.0.json`,
  regenerated deliberately by `scripts/write-golden.mjs`); the framework
  wrappers' SSR / hydration fixtures need regenerating too.

### Added

- **Enharmonic keys are merged, by default** (`mergeEnharmonicKeys`,
  `data-merge-enharmonic-keys`, a render option): A#m and Bbm, C# and Db
  are one key-menu entry, a filter on either spelling finds both, the
  search finds either, and `?key=` accepts either. The entry shows the
  spelling the pack uses most; a tie goes to the conventional spelling —
  the key signature with the fewest accidentals (Db, Eb, F#, Ab, Bb, B
  major; C#m, Ebm, F#m, G#m, Bbm minor; F# and Ebm for the six-and-six
  ties). Rows show their key as written. `false` keeps spellings apart.
  `facets()` returns `keyAliases`; `facets`, `matches` and `readUrlState`
  take `{mergeEnharmonicKeys}`.
- **Rows are rendered as they are revealed.** With paging, the page; with
  paging off, 50 at a time as the list scrolls toward its end. Rows that
  stop being shown (filtered, sorted past the page) leave the DOM, kept
  with their drawing for when they return. Filtering, sorting, search, the
  address, ↑/↓/Home/End, `next()`, auto-advance and the "Playing…" status
  all work across rows not yet rendered (↓ or End renders up to the row
  it lands on). 1000 sounds, paging off, Chromium: 17,001 → 1,182 DOM
  elements; load's longest task 287 → 0 ms (SSR: 289 → 0); clear filters
  82 → 16 ms; sort by name 163 → 35 ms. 300 sounds: 5,325 → 1,182
  elements, nothing slower beyond noise (a type filter with paging off
  7 → 13 ms; clear 31 → 20, sort 50 → 17).
- Strings `rowBpm`, `rowKey`, `rowDuration`, `keyMajor`, `keyMinor`,
  `noteSharp`, `noteFlat`, `listSeparator` (the rows' read-out).

### Fixed

- **A screen reader met one slider per row** ("Seek …" ×300, each
  focusable by a click); now only the current sound's waveform is a
  slider. ←/→ and Home/End on it are unchanged.
- **Row waveforms draw any peak count well**: with more bars than peaks
  (64 peaks across a wide row) each peak was repeated into flat steps; now
  the bars are interpolated. 64, 128 and `wp1:` peaks of any length draw
  the same shape.
- A sound that failed to load stays marked when its row is rendered later.
- Re-sorting keeps focus on the focused row (moving it used to drop focus).

## [2.1.0] — 2026-11-21

Fixes from an audit of 2.0.0 in Chromium, Firefox and WebKit (and Chrome
115–133 / Firefox 115–128 binaries), the `<waveform-sounds>` element, and
the family's event and server-rendering surface. Non-breaking: for packs
with whole-number BPMs, `renderSounds` output is byte-identical to 2.0.0
(a golden test holds it so).

### Fixed

- **Switching sounds while one plays is reported.** ↓ audition, `play(i)`,
  `next()` and auto-advance emitted no `waveformsounds:play` / `onPlay` for
  the new sound (and no `pause` for the outgoing one), and the live region
  kept the first title: the browser swaps the source without a `pause`, so
  the playing flag never flipped. Events now follow the sound.
- **A sound that fails is no longer left "playing".** A 404, an
  undecodable file or a dropped connection set `is-error` but left
  `playing` true and the row's button reading "Pause". Now the state
  settles, the live region announces it (new string `playError`), and the
  row's mark clears once it loads.
- **A list that can't be built says so.** A manifest that 404s or isn't
  JSON left an empty container; one that isn't a manifest rendered "No
  sounds match." with a Clear button. Now `loadError` shows where the list
  would be (`role="alert"`; a site's own fallback content in the container
  stays), and an empty pack shows `noSounds` with nothing to clear.
- **Pressed controls are readable before the script measures the page.**
  Chrome 119–130 (relative colour, but not from `currentColor`) and
  Firefox 128–132 (`currentColor` resolved as black) painted a pressed
  chip, segment or Loop toggle in text colour on a text-colour fill on
  dark pages (1.0–1.2:1) until the runtime measured the surface. There,
  until it has, a pressed control is a tint with text-colour ink (9:1).
  Current engines are unchanged.
- **The surface is re-measured when a theme flips on any ancestor**
  (class, style or `data-theme` on a section, a card, a framework's root;
  not only `<html>` / `<body>`), and on a forced-colours switch.
- **The BPM panel fits on phones.** At phone width it hung off the
  screen's edge; in the narrow layout the menus now open from the
  controls row and never exceed it.
- **Fractional BPMs.** The slider steps by 1, so a pack whose fastest loop
  is 128.5 BPM had a top handle stuck at 128 that filtered that loop out.
  The slider's ends are now the pack's range rounded outward (floor /
  ceil). **The rendered BPM slider's `min` / `max` / ends change for packs
  with fractional BPMs only** (e.g. 128.5 → 129).
- **The address.** `?bpm=` with the ends reversed is put in order, limits
  outside the pack are ignored (a stale link no longer empties the list),
  and decimals are read — so it round-trips what `setFilter` writes.
- **Focus never drops to `<body>`:** after "Clear filters" it goes to the
  search box, after the last "Show more" to the first row it revealed, and
  out of a row that a filter hides to the first row shown.
- `parseDuration('1:-30')` is `null` (was 30).

### Changed

- **The list is one Tab stop** (roving tabindex, set at runtime; the markup
  is unchanged): the focused row's play button — with its download link,
  and its seek slider when it is the current sound — and ↑/↓ between rows,
  as before.
- **Resize and theme repaints draw only the rows on screen**; the rest are
  redrawn when they scroll back in. 1000 rows: ~410 → 5ms per resize step
  in Chromium, ~1.9s → 25ms in WebKit, ~650 → 10ms in Firefox.
- **The strip's cue fetches nothing.** The docked player's first sound is
  cued with `preload: 'none'` (title, length and peaks come from the data),
  and the next sound played gets the engine's own `preload` back. 300
  sounds, 8 filter changes, no play: 0 audio requests (was 6 files, ~2MB,
  in Firefox and WebKit).
- **Forced colours** (Windows High Contrast): pressed states and the
  playing row's button use Highlight / HighlightText (their icons were
  invisible), the BPM track is drawn, focus is an outline rather than a
  box-shadow, and the row waveforms draw in CanvasText / Highlight.
- **Focus and targets:** the search field shows a 2px focus ring on its
  frame (and the menu search field one of its own); "Any BPM" is a 24×24
  target.
- `waveformsounds:*` events are `composed` (they leave a shadow root, like
  the core's).
- `renderSoundsElement` writes a `data-*` attribute for every render option
  you set (`data-page-size="20"`, `data-filters=""`, `data-strings='…'`),
  so the runtime adopting it keeps them (a `pageSize` of 20 was re-paged to
  50). Its inner markup is `renderSounds`' as before, and with only
  `player` (or nothing) set the element is unchanged too.
- `engine` is typed as the core's `WaveformPlayer` (was `unknown`);
  `SoundInput.loop` accepts the strings and numbers the runtime reads
  (`'true'`, `'1'`, `1`, …).
- Re-sorting is linear (was quadratic), and one filter pass serves each
  layout.

### Added

- **`<waveform-sounds>`**, a light-DOM custom element modelled on the
  core's `<waveform-player>`: every `data-*` option as an attribute with or
  without the prefix (`<waveform-sounds manifest="/sounds.json"
  page-size="20">`), server markup inside it adopted as it is today,
  events bubbling from it, `.sounds` for the instance; a move keeps it,
  attribute changes rebuild it. Registered by the default entry (behind
  the same `data-waveform-autoinit="false"` opt-out); `/no-autoinit`
  exports `defineWaveformSoundsElement(name)` and `WaveformSoundsElement`.
- **`WaveformSounds.defineElement(name?)`** — the definer as a static, so
  a `<script>` page that opted out of auto-init can register the tag (as
  the core's `WaveformPlayer.defineElement()`).
- **`destroy({restore: true})`** puts adopted server markup back exactly as
  it arrived, for frameworks that re-mount the same markup. `destroy()` is
  unchanged.
- **The instance is an `EventTarget`**: `list.addEventListener('play', …)`
  for `ready`, `play`, `pause`, `end`, `filter` and `error`, after the
  container's `waveformsounds:*` event (`WaveformSoundsInstanceEventMap`).
- The `waveformsounds:*` event map is merged into `DocumentEventMap` and
  `WindowEventMap` as well, so `document.addEventListener(...)` is typed.
- **`RENDER_OPTION_KEYS` and `pickRenderOptions(options)`** (from `/render`
  and the main entry): the options that shape the server markup, for
  wrappers handing props to `renderSounds`.
- **The seek slider reads out its time** (`aria-valuetext`, "0:12 of 0:30",
  string `seekValue`), and Home / End on it seek to the start / end.
- `decodePeaks` — so manifests and `data-peaks` — accepts the core's
  compact `wp1:` peaks; the server markup still writes hex.
- Strings `playError`, `loadError`, `noSounds`, `seekValue`.

## [2.0.0] — 2026-11-21

Version 2.0.0 lines the package up with `@arraypress/waveform-player` 2.0,
which it now requires. The list itself works as in 0.3.1: options, markup,
classes, events and the server-rendered HTML are unchanged (`renderSounds`
output is byte-identical).

### Added

- **A sound's known length reaches the player.** A sound with a `duration`
  passes it to the engine (the 2.0 core's `duration` option), so the
  player shows the right total, places a seek and fills the Media Session
  scrubber before the audio's metadata arrives.
- **A docked player's download link matches the row.** With
  `playerOptions: {showDownload: true}` in the `strip` layout, the
  player's download link is the sound's `download`, else its audio.

### Changed

- **Requires `@arraypress/waveform-player` 2.0** (peer `^2.0.0`).
- **Written in TypeScript.** The type declarations are generated from the
  source into `types/` instead of being written by hand. The root
  `index.d.ts`, `no-autoinit.d.ts` and `render.d.ts` are gone; the
  `exports` map points each entry at its declarations
  (`types/index.d.ts`, `types/entry.d.ts`, `types/render-entry.d.ts`), and
  the option types live in `types/types.d.ts`. Declaration maps ship, so
  Go to definition opens the TypeScript source.
- **Browser support is Chrome/Edge 111+, Firefox 114+ and Safari 16.4+**
  (all from early 2023), as for the core. The bundles are built for ES2022.
- **The script-tag builds run in strict mode.** `waveform-sounds.js` and
  `.min.js` now start with `"use strict"`; the ES module builds always ran
  strict, as every ES module does.
- **`playerOptions` can't take looping from the list.** The engine's `loop`
  and `showLoop` are always off: the player's loop would stop `ended`
  (stalling `autoAdvance`), and its toggle would loop one-shots behind the
  Loop toggle's back. `duration`, `downloadUrl` and `downloadName` in
  `playerOptions` are ignored: they describe one track, and each sound
  brings its own. `lazy` has no effect on the engine (it loads nothing
  until a sound plays); `showVolume`, `volume` and the rest pass through.
- **Search uses `@arraypress/text` 2.3.1** (bundled). Accents still fold
  away (`Café` finds `cafe`), but the marks that are part of a letter in
  scripts such as Devanagari are kept: `हिन्दी बेस` was searched as the
  fragments `ह`, `नद`, `बस`, and is now the two words it spells.

### Fixed

- **Reduced motion covers every transition.** The segmented control, the
  download button and the menu chevron still animated with
  `prefers-reduced-motion: reduce`.
- **Pressed controls are readable before the script runs where relative
  colour isn't supported** (Safari 16.4–17, Firefox before 128): the
  "on" ink falls back to the page surface instead of painting the text
  colour on a text-colour fill.

### Removed

- **The CommonJS builds** (`waveform-sounds.cjs`,
  `waveform-sounds-no-autoinit.cjs`, `waveform-sounds-render.cjs`), the
  `require` export conditions and the `module` field. `main` is the ES
  module build. `require('@arraypress/waveform-sounds')` (and `/render`,
  `/no-autoinit`) still works: Node 22.12+ loads the ES module through
  `require()`, and `engines` now says `>=22.12`.
- **Vendor prefixes the browser floor doesn't need** (`-webkit-appearance`
  beside `appearance`) and the deprecated `clip` on `.ws-sr`
  (`clip-path: inset(50%)` instead).

## [0.3.1] — 2026-10-08

### Fixed

- **The strip's docked player no longer starts empty.** It showed a play
  button, no waveform and `0:00 / 0:00`, and its button did nothing. The
  first sound the list shows is now cued in it — title, waveform, length —
  without playing (metadata only, the browser default for any `<audio>`),
  and its button plays it. Its row isn't marked until it plays, `current`
  stays `null`, `next()` starts with it, and a filter change re-cues the
  first sound still shown until something plays.
- **The docked player stays in place.** It was `position: sticky`, so it
  slid along the bottom of the screen over the rows as the page scrolled.
  It's static now; `--ws-strip-position: sticky` brings the old behaviour
  back for a long list.
- **Rows and the player agree on lengths.** Rows rounded to the nearest
  second and the player's clock rounds down, so a 7.6s sound read `0:08`
  in its row and `0:07` in the player. Rows round down too now.

## [0.3.0] — 2026-10-07

### Changed

- **BPM is a menu with a two-handle range** instead of two number fields.
  The button reads `Any BPM`, or `120–128 BPM` once set; its panel holds a
  range across the pack's own tempos (two native range inputs on one track:
  arrow keys, screen readers and touch work as they do on any slider), the
  live readout and an `Any BPM` reset. The label follows the drag; the list
  re-filters once it settles. A handle left at an end is no limit on that
  side, so a range nobody narrowed never hides the sounds without a BPM.
  `?bpm=` in the address and `setFilter({bpmMin, bpmMax})` work as before.
  New strings: `anyBpm`, `bpmRange`.
- **On a list that marks loops, Loop starts on.** Only loops repeat (as in
  0.2.0), so loops repeat out of the box and one-shots still play once. The
  `loop` option now defaults to `null` (follow the data); `true` / `false`
  still force it. A list that marks nothing starts with it off, as before.

### Removed

- `.ws-bpm-range` and its number inputs (`data-ws-bpm-min` / `-max` are
  now the range handles).

## [0.2.0] — 2026-10-07

### Added

- **Loops and one-shots.** A sound can be marked `loop: true`; anything
  else is a one-shot. Marking loops does three things:
  - a small loop icon beside the name (with "Loop" for screen readers);
  - an **All / Loops / One-shots** filter, offered only when the list has
    both kinds (`filters` entry `'loop'`, on by default; in the address
    as `?loop=loop` / `?loop=one-shot` with `urlState`);
  - the Loop toggle repeats only loops. A one-shot always plays once.
  A list that marks no loops behaves exactly as before.
- `isLoop()` and `LOOP_FILTERS` in the data module; `facets()` reports
  `loops` and `oneShots`; four new strings (`loopFilter`, `loops`,
  `oneShots`, `isLoop`).

### Changed

- The title cell wraps its text in `.ws-title-text` (so a loop's icon can
  sit after an ellipsised name). Styling `.ws-title` still works.

## [0.1.3] — 2026-10-07

### Fixed

- **Sounds under a second show their length.** `formatDuration` rounded to
  whole seconds, so a 0.38s one-shot read `0:00` — which looks like a
  missing length, and one-shots (kicks, hats, single notes) are routinely
  that short. Under a second it now shows tenths: `0.4s`.
- **The `strip` player matches a dark page.** Its background fell back to the
  system `Canvas` colour, which is white on a dark page that doesn't declare
  `color-scheme: dark` — a white box under a dark list. It now falls back to
  `--ws-surface` (the measured page surface), as the dropdowns already did.
- **No stray `·` on a narrow screen.** The mobile meta line put a separator
  before a cell whenever any cell came first, even an empty one, so a sound
  with no key read `· 0:08`. It now follows only a cell with content.

## [0.1.2] — 2026-10-07

### Fixed

- **The `strip` layout keeps its docked styling.** The engine was mounted on
  the `.ws-engine` slot itself, and `WaveformPlayer` resets its container's
  `className`, so `ws-engine--strip` was wiped on the first play: no sticky
  position, border, padding, `--ws-strip-bg` or `--ws-radius`. The engine now
  mounts into a child of the slot (`[data-ws-engine-mount]`, made at runtime,
  so server-rendered markup from 0.1.0/0.1.1 works unchanged) and `destroy()`
  removes it.
- `render.d.ts` declares `escapeHtml`, which `/render` has always exported.

## [0.1.1] — 2026-10-06

### Fixed

- **The playing row's progress is smooth.** It was painted a whole bar at a
  time (a bar switched colour once the playhead passed its middle), so a
  short clip advanced in visible steps — an 8-second loop across ~120 bars
  moved ~15 times a second however often it was redrawn. The bars are now
  drawn twice, the second pass clipped at the exact playhead pixel: the
  played part grows through the middle of a bar. Measured in Chrome: the
  edge moves every ~1px (≈37 times a second on a 12-second clip at 60fps).
- Bar geometry is a pure, tested function (`barRects`), and each pass is a
  single `fill()` of a `Path2D` instead of one `fillRect` per bar.

## [0.1.0] — 2026-10-06

### Added

- First release: a searchable, filterable list of sounds for showcasing the
  previews inside a sample pack, preset bank or sound library.
- One `WaveformPlayer` (self mode) is the audio engine for the whole list, so
  playback gets the player's seeking (including hosts that ignore byte
  ranges), error handling, Media Session card and `singlePlay` hand-off.
- Two layouts: `inline` (a mini waveform per row; the playing row fills and
  is click-to-seek) and `strip` (plain rows, the engine docked below).
- Search (every word, any order; a number matches the BPM), type chips (a
  menu past `maxTypeChips`), key menu, BPM range, sort, Loop toggle, paging.
- Keyboard: ↑/↓ move and, while a sound plays, audition the next; ←/→ seek;
  `/` focuses the search; ↓ from the search enters the list.
- Peaks as an 8-bit hex string (two characters per bar).
- `@arraypress/waveform-sounds/render`: a DOM-free renderer for server
  rendering; the runtime adopts its markup instead of rebuilding it.
- `@arraypress/waveform-sounds/no-autoinit`.
- Dropdowns for type (past `maxTypeChips`), key and sort: a button and a
  popup listbox, with a search field past `menuSearch` (8) options; ↑/↓,
  Enter, Esc, type to narrow (WAI-ARIA combobox/listbox).
- Every control is optional: `search`, `filters`, `sorts` (which orders,
  in order; the first is the starting order), `loopToggle`, `showCount`,
  `columns`.
- Optional per-sound `download` link (a download button on that row only).
- `urlState`: the filters and sort live in the address (shareable,
  survive a refresh), optionally prefixed for several lists on a page.
- The engine is built when the list is ready (no audio loaded), so
  waveform-tracker and other `waveformplayer:ready` hooks see the first play.
- Colour-agnostic by default: the "on" states are inverted (text colour as
  fill, page surface as ink). The surface is detected (`--ws-surface`) and
  re-read on theme flips; set it yourself for the first server paint.
