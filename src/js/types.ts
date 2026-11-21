/**
 * The public data, option and event types of WaveformSounds. Moved here from
 * the hand-written index.d.ts so the source uses the same definitions the
 * published types are generated from.
 *
 * The four `waveform-sounds-*` wrappers derive their prop types from
 * `WaveformSoundsOptions` here. Add or rename an option in `core/options.ts`
 * (`DEFAULT_OPTIONS`) and in this file in the same change.
 *
 * @module types
 */

import type {WaveformSounds} from './core/WaveformSounds.js';

/** One sound, as given (a manifest entry, a `sounds` item). */
export interface SoundInput {
    /** Audio URL. Required. */
    url: string;
    /** Display name. Defaults to the file name. */
    title?: string;
    /** Kind of sound ("Drum loops", "Bass", "One-shots"): the type chips. */
    type?: string;
    /** Tempo. Enables the BPM range filter and sort. */
    bpm?: number | string;
    /** Musical key, any common spelling ("F minor", "Fmin", "F#"). Shown
     *  and filtered in a short canonical form ("Fm", "F#"). */
    key?: string;
    /** Length: seconds (8.02) or "m:ss". */
    duration?: number | string;
    /** Extra words the search matches. */
    tags?: string[] | string;
    /** Low-resolution peaks for the row waveform: an 8-bit hex string
     *  (two characters per bar, what `waveform-gen --manifest` writes) or
     *  numbers 0..1. Without them the row shows a flat line until played. */
    peaks?: string | number[];
    /** Full-resolution peaks for the `strip` player (a waveform-gen `.json`
     *  URL or an array). */
    waveform?: string | number[];
    /** Optional download link for this sound (a free sample, the `.mid` of
     *  a MIDI preview). Rows with one get a download button; rows without
     *  carry nothing. A plain `<a download>`: gating is the site's job. */
    download?: string;
    /** A loop (`true`) rather than a one-shot (the default). Loops get a
     *  loop icon beside their name, the "Loops / One-shots" filter appears
     *  once a list has both, and with any sound marked the Loop toggle
     *  repeats only loops. As data writes it, `'true'` / `'1'` / `1` also
     *  mean a loop; anything else is a one-shot. */
    loop?: boolean | 'true' | 'false' | '1' | '0' | 1 | 0;
    /** Stable id for `play('id')`. Defaults to `sound-<n>`, 1-based
     *  (`sound-1` is the first sound). */
    id?: string;
}

/** A sound after normalisation (what the runtime holds). */
export interface Sound {
    id: string;
    url: string;
    title: string;
    type: string;
    bpm: number | null;
    key: string;
    duration: number | null;
    tags: string[];
    peaks: number[] | null;
    waveform: string | null;
    download: string | null;
    loop: boolean;
}

/** What `waveform-gen --manifest` writes (a bare array also works). */
export interface SoundsManifest {
    version?: number;
    /** Scale of integer `peaks` arrays (e.g. 100). Ignored for hex peaks. */
    peakScale?: number;
    sounds: SoundInput[];
}

export interface SoundsFilter {
    /** Words matched (all of them, any order) against title, type, key and
     *  tags; a number also matches the BPM exactly. */
    query: string;
    /** One type, or '' for all. */
    type: string;
    /** One key, or '' for any. */
    key: string;
    bpmMin: number | string;
    bpmMax: number | string;
    /** `'loop'`: loops only. `'one-shot'`: everything else. '' for both. */
    loop?: SoundsLoopFilter;
}

export type SoundsLoopFilter = '' | 'loop' | 'one-shot';

export type SoundsSort = 'default' | 'title' | 'bpm' | 'key' | 'duration';
export type SoundsLayout = 'inline' | 'strip';
export type SoundsFilterControl = 'type' | 'key' | 'bpm' | 'loop';
export type SoundsColumn = 'type' | 'bpm' | 'key' | 'duration';

/** Every visible or announced word. `{title}`, `{count}`, `{total}` are filled in. */
export interface WaveformSoundsStrings {
    search: string;
    searchPlaceholder: string;
    all: string;
    types: string;
    key: string;
    anyKey: string;
    allTypes: string;
    findType: string;
    findKey: string;
    noMatches: string;
    bpm: string;
    bpmMin: string;
    bpmMax: string;
    /** The BPM menu with no limit set. */
    anyBpm: string;
    /** The BPM menu's range: `{min}`, `{max}`. */
    bpmRange: string;
    sort: string;
    sortBy: string;
    sortDefault: string;
    sortTitle: string;
    sortBpm: string;
    sortKey: string;
    sortDuration: string;
    loop: string;
    loopFilter: string;
    loops: string;
    oneShots: string;
    isLoop: string;
    play: string;
    pause: string;
    seek: string;
    /** The playing row's seek slider, read out: `{time}`, `{duration}`
     *  ("0:12 of 0:30"). Since 2.1.0. */
    seekValue: string;
    download: string;
    count: string;
    countOne: string;
    countFiltered: string;
    showMore: string;
    empty: string;
    clear: string;
    nowPlaying: string;
    /** Announced when a sound fails to load or play. Since 2.1.0. */
    playError: string;
    /** Shown in place of the list when it can't be built (the manifest
     *  fails to load or isn't a manifest). Since 2.1.0. */
    loadError: string;
    /** The empty state of a list with no sounds at all. Since 2.1.0. */
    noSounds: string;
}

export interface WaveformSoundsOptions {
    /** The sounds. Or `manifest`, or server-rendered rows in the container. */
    sounds?: SoundInput[] | null;
    /** URL of a sounds manifest (JSON), fetched when there are no `sounds`
     *  and no server-rendered rows. */
    manifest?: string | null;
    /** `'inline'` (default): a mini waveform per row, the playing row fills
     *  and seeks. `'strip'`: plain rows and one full player docked below. */
    player?: SoundsLayout;
    /** Show the search box. Default true. */
    search?: boolean;
    /** Which filter controls to offer (each appears only when the data has
     *  something to filter: 2+ types, 2+ keys, a BPM range, both loops and
     *  one-shots). Drop one to
     *  remove it, e.g. `['type']` for no key or BPM filtering — and leave
     *  it out of `columns` and `sorts` to remove it everywhere. `[]` = no
     *  filters. */
    filters?: SoundsFilterControl[];
    /** The sort orders the Sort menu offers, in order; the first is the
     *  starting order. Orders the data can't use are dropped (no BPM sort
     *  without BPMs). `[]` (or one usable order) hides the menu.
     *  Default `['default', 'title', 'bpm', 'key', 'duration']`. */
    sorts?: SoundsSort[];
    /** Show the "12 of 300 sounds" count. Default true. */
    showCount?: boolean;
    /** A dropdown (type / key / sort) gets a search field when it has more
     *  than this many options. Default 8. */
    menuSearch?: number;
    /** Prefix for the dropdowns' element ids. Default: the container's `id`,
     *  else a hash of the sounds — so two lists of the SAME sounds on one
     *  page each need one (or an `id`). Wrappers pass a framework-unique id. */
    idPrefix?: string;
    /** Keep the filters in the address (`?q=bass&type=Bass+loops&key=Fm&
     *  bpm=120-130&sort=bpm`), so a filtered list can be shared and survives
     *  a refresh. `true` uses those names; a string prefixes them
     *  (`'pack'` → `pack-q`, `pack-type`, …) for several lists on a page.
     *  Uses replaceState: filtering adds no history entries. Default false. */
    urlState?: boolean | string;
    /** Show the Loop toggle. Default true. When any sound is marked
     *  `loop: true`, only loops repeat. */
    loopToggle?: boolean;
    /** Up to this many types show as chips; more become a "Type" menu
     *  (a pack has a handful, a whole library can have fifty). Default 10. */
    maxTypeChips?: number;
    /** Rows shown before "Show more" (0 = all). Default 50. */
    pageSize?: number;
    /** Columns after the title, in order. Default all four. */
    columns?: SoundsColumn[];
    /** Row waveform style. Default `'mirror'`. */
    waveformStyle?: 'mirror' | 'bars';
    /** Row waveform colour. Default: CSS `--ws-wave-color`. */
    waveformColor?: string | null;
    /** Played-part colour. Default: CSS `--ws-progress-color` (the accent). */
    progressColor?: string | null;
    /** Row bar width in CSS px. Default 2. */
    barWidth?: number;
    /** Gap between row bars in CSS px. Default 1. */
    barGap?: number;
    /** Start with Loop on or off. Unset (default): on when any sound is
     *  marked `loop: true` (then only loops repeat), off otherwise. */
    loop?: boolean | null;
    /** Play the next visible sound when one ends. Default false. */
    autoAdvance?: boolean;
    /** While a sound plays, ↑/↓ move to the next row AND play it (the
     *  sample-browser audition). Default true. */
    arrowAudition?: boolean;
    /** Options for the engine `WaveformPlayer` (colours, height, … — and its
     *  callbacks, which are called alongside the list's own). `audioMode` is
     *  always `'self'`; `loop` and `showLoop` are always off (the list's Loop
     *  toggle owns looping); `duration`, `downloadUrl` and `downloadName` are
     *  ignored (each sound brings its own). As markup: `data-player-options`
     *  (JSON). */
    playerOptions?: Record<string, unknown> | null;
    /** The `WaveformPlayer` class, for ESM setups without the global. */
    playerClass?: unknown;
    /** UI strings (partial: merged over the English defaults). As markup:
     *  `data-strings='{"count":"{count} geluiden"}'` (JSON). */
    strings?: Partial<WaveformSoundsStrings> | null;
    onReady?: ((instance: WaveformSounds) => void) | null;
    onPlay?: ((sound: Sound, instance: WaveformSounds) => void) | null;
    onPause?: ((sound: Sound, instance: WaveformSounds) => void) | null;
    onEnd?: ((sound: Sound, instance: WaveformSounds) => void) | null;
    /** After every filter/sort/page change, with the matching sounds. */
    onFilter?: ((visible: Sound[], instance: WaveformSounds) => void) | null;
    onError?: ((error: unknown, instance: WaveformSounds) => void) | null;
}

/** `detail` of the `waveformsounds:*` DOM events. All bubble and are
 *  composed (they leave a shadow root); merged into `HTMLElementEventMap`,
 *  `DocumentEventMap` and `WindowEventMap`, so `addEventListener` on an
 *  element, `document` or `window` is typed. */
export interface WaveformSoundsEventMap {
    'waveformsounds:ready': CustomEvent<{sounds: number; instance: WaveformSounds}>;
    'waveformsounds:play': CustomEvent<{sound: Sound; index: number; instance: WaveformSounds}>;
    'waveformsounds:pause': CustomEvent<{sound: Sound; index: number; instance: WaveformSounds}>;
    'waveformsounds:end': CustomEvent<{sound: Sound; index: number; instance: WaveformSounds}>;
    'waveformsounds:filter': CustomEvent<{visible: number; total: number; filter: SoundsFilter; sort: SoundsSort; instance: WaveformSounds}>;
    'waveformsounds:error': CustomEvent<{error: unknown; sound?: Sound; index?: number; instance: WaveformSounds}>;
}

/** The plain events a {@link WaveformSounds} dispatches on itself — it is an
 *  `EventTarget`, so `list.addEventListener('play', …)` works and is typed.
 *  Each mirrors a `waveformsounds:*` container event (whose `detail`
 *  carries the data); the matching `on*` callback still runs. Since 2.1.0. */
export interface WaveformSoundsInstanceEventMap {
    ready: Event;
    play: Event;
    pause: Event;
    end: Event;
    filter: Event;
    error: Event;
}
