<div align="center">

# Waveform Sounds

**A searchable, filterable sound list for WaveformPlayer.**

Audition hundreds of sample previews: a mini waveform per row, search, type /
key / BPM filters, sort, loop, keyboard auditioning, and one shared audio
engine — never a player per row.

</div>

---

## Install

```bash
npm install @arraypress/waveform-player @arraypress/waveform-sounds
```

```js
import '@arraypress/waveform-player';
import '@arraypress/waveform-sounds';
import '@arraypress/waveform-player/styles.css';
import '@arraypress/waveform-sounds/styles.css';
```

```html
<div data-waveform-sounds data-manifest="/sounds.json"></div>
```

Or as a custom element — every `data-*` option works as an attribute,
with or without the prefix, and server-rendered markup inside it is
adopted:

```html
<waveform-sounds manifest="/sounds.json" page-size="20"></waveform-sounds>
```

The default import registers it; with `/no-autoinit` (or
`data-waveform-autoinit="false"`), call `defineWaveformSoundsElement()` —
`WaveformSounds.defineElement()` from a `<script>` page.

Generate the manifest from a folder of previews (BPM and key are read from
file names like `Bass_Loop_04_128_Fmin.wav`; the type is the sub-folder).
`--base-url` is the public URL the folder is served at:

```bash
npx @arraypress/waveform-gen ./public/previews/ --recursive \
  --manifest ./public/previews/sounds.json --base-url /previews/
```

(`--manifest` needs `@arraypress/waveform-gen` 2.1.0 or later.)

## Options

`player` (`'inline'` | `'strip'`), `search`, `filters`, `sorts`,
`loopToggle`, `showCount`, `pageSize` (50), `maxTypeChips` (10), `menuSearch` (8), `columns`,
`waveformStyle`, `waveformColor`, `progressColor`, `barWidth`, `barGap`,
`loop`, `autoAdvance`, `arrowAudition`, `playerOptions`, `strings`, and the
callbacks `onReady` / `onPlay` / `onPause` / `onEnd` / `onFilter` / `onError`.
Every option has a `data-*` form (`data-page-size="100"`); `strings` and
`playerOptions` take JSON. Each one is documented in the type declarations
(`WaveformSoundsOptions`).

### The engine player (`playerOptions`)

Every sound plays through one `WaveformPlayer`, and `playerOptions` is
passed to it — its look, `preload`, `volume`, its callbacks (called after
the list's own). In the `strip` layout it is the docked player, so
`showVolume` and `showDownload` show there (the download link is the
sound's `download`, else its audio). A few options are the list's to set:

- `audioMode` is always `'self'`.
- `loop` and `showLoop` are always off: the Loop toggle (the `loop` option)
  owns looping, and repeats only the sounds marked as loops.
- `duration`, `downloadUrl` and `downloadName` are ignored: they describe
  one track. A sound's own `duration` reaches the player instead, so its
  length shows before the audio's metadata loads.
- `lazy` has no effect: the engine is built empty and the list loads each
  sound into it when it plays (the strip also cues the first one).

Every control can go. No BPM anywhere:

```js
{filters: ['type', 'key'], columns: ['type', 'key', 'duration'], sorts: ['default', 'title', 'key']}
```

## Loops and one-shots

A sound is a one-shot unless it says otherwise. Mark loops with `loop: true`:

```js
{url: '/previews/drums-01.mp3', title: 'Drums 01', bpm: 128, loop: true}
```

A loop gets a small loop icon beside its name. Once a list has both kinds,
a **All / Loops / One-shots** filter appears (`filters` entry `'loop'`;
drop it to hide the control). And the Loop toggle starts on and repeats
only loops: a one-shot always plays once (turn it off to hear loops once).
A list that marks nothing works as before.
`waveform-gen --manifest` sets `loop: true` for files whose folder or name
contains the word "loop".

## Download links

Optional, per sound — a free sample, the `.mid` of a MIDI preview. Rows
with one get a download button; rows without carry nothing:

```js
{url: '/previews/kick-01.mp3', title: 'Kick 01', download: '/free/kick-01.wav'}
```

It's a plain `<a download>`: gating (an email, a login) is the site's job.

## Filters in the address

`urlState: true` keeps the filters in the URL —
`?q=bass&type=Bass+loops&key=Fm&bpm=120-130&loop=one-shot&sort=bpm` — so a filtered list
can be shared and survives a refresh. `urlState: 'pack'` prefixes the names
(`pack-q`, `pack-type`, …) when a page has more than one list. It uses
`replaceState`, so filtering adds no back-button entries; values the data
can't use are ignored.

## Which sounds get played (analytics)

The list plays through a regular `WaveformPlayer`, so
[`@arraypress/waveform-tracker`](https://www.npmjs.com/package/@arraypress/waveform-tracker)
tracks it with no extra code — each event carries that sound's `url` and
`title`:

```js
import WaveformTracker from '@arraypress/waveform-tracker';
WaveformTracker.init({endpoint: '/api/listens', events: {play: 3, listen: 15}});
```

(The engine is built when the list is ready, so the tracker is attached
before the first play.)

## Keyboard

| Key | Does |
|---|---|
| Tab | The list is one stop: the focused (else first) row |
| ↑ / ↓ | Move between sounds; while one plays, play the next |
| ← / → | Seek the playing sound |
| Home / End | First / last sound; on the playing row's seek slider, its start / end |
| Space / Enter | Play / pause |
| `/` | Search |

## Server rendering

```js
import {renderSounds} from '@arraypress/waveform-sounds/render';
const html = `<div class="waveform-sounds waveform-sounds--inline" data-waveform-sounds>${renderSounds(sounds, options)}</div>`;
```

The runtime adopts that markup instead of rebuilding it. Keep the
`waveform-sounds` classes on the wrapper (`waveform-sounds--strip` for the
strip): the stylesheet hangs off them, so without them the list paints
unstyled until the script runs and then shifts. `renderSoundsElement(sounds,
options, className)` writes the whole wrapper — the classes, and a `data-*`
attribute for every render option you set, so the runtime keeps them (pass
the same options to both, or a `pageSize` the runtime doesn't know is
re-paged to 50). `pickRenderOptions(props)` picks the options that shape
the markup out of a component's props.

## Theming

Colour-agnostic by default, like the rest of the family: everything derives
from `currentColor`, and the "on" states (selected chip, playing row) are
inverted — white on a dark page, black on a light one. Custom properties on
`.waveform-sounds`: `--ws-accent` / `--ws-on-accent` (opt into a brand
colour), `--ws-surface` (the page background; detected, but set it for the
first server-rendered paint), `--ws-wave-color`, `--ws-progress-color`,
`--ws-border`, `--ws-radius`, `--ws-control-radius`, …

## License

MIT © [ArrayPress](https://github.com/arraypress)
