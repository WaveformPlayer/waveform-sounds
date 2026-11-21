/**
 * WaveformSounds — a searchable, filterable list of sounds for showcasing
 * the previews inside a sample pack, preset bank or sound library.
 *
 * One `WaveformPlayer` (self mode) is the audio engine for the whole list:
 * every sound plays through it, so it brings the player's seeking (incl.
 * hosts that ignore byte ranges), error handling, Media Session card and
 * hand-off with every other player on the page. The rows are light: a
 * button, some text and, in the `inline` layout, a small canvas drawn from
 * low-resolution peaks only when it scrolls into view. 300 sounds is 300
 * rows, not 300 players.
 *
 * Layouts (`player`):
 *   - `'inline'` (default): every row has a mini waveform; the playing row
 *     fills with progress and is click-to-seek. The engine is hidden.
 *   - `'strip'`: plain rows; the engine is shown docked under the list as a
 *     full player for the current sound.
 *
 * This class orchestrates; the pieces live by layer:
 *   - `core/`   — this class, the engine's configuration, the option surface
 *   - `data/`   — pure logic: sounds, filtering, the address, navigation
 *   - `render/` — server-safe markup (also the `/render` entry)
 *   - `dom/`    — browser-only behaviour: dropdowns, rows, canvas, colours
 *   - `shared/` — small helpers
 *
 * @module core
 */

import {availableSorts, facets, formatClock, formatDuration, matches, normalizeKey, normalizeSounds, parseManifest, sortSounds, SORTS} from '../data/sounds.js';
import {keyEntry} from '../data/keys.js';
import {drawRowWaveform, resample} from '../dom/draw.js';
import {engineOptions, engineTrack} from './engine.js';
import {Menus} from '../dom/menus.js';
import {limitToReveal, pageWindow, rowTarget, seekTarget, sliderEdgeTarget} from '../data/navigation.js';
import {DEFAULT_OPTIONS, mergeOptions, readDataOptions} from './options.js';
import {resolveRenderOptions} from '../render/options.js';
import {loopsByDefault, renderSounds} from '../render/markup.js';
import {indexRows, orderRows, readRows, visibleRows} from '../dom/rows.js';
import {bpmLabel, countText, DEFAULT_STRINGS, fill} from '../render/strings.js';
import {bpmExtent, bpmFilterFromRange, bpmFraction, bpmRangeFromFilter} from '../data/bpm.js';
import {ancestorsOf, forcedColors, pageSurface, resolveCssColor} from '../dom/colors.js';
import {readUrlState, urlKeys, writeUrlState} from '../data/url-state.js';
import {emit, isTyping, LOG, pointerFraction} from '../shared/utils.js';
import {h, text} from '../render/html.js';
import type {decodePeaks, encodePeaks} from '../data/sounds.js';
import type {EngineTrack} from './engine.js';
import type {WaveformPlayer} from '@arraypress/waveform-player';
import type {RenderOptions} from '../render/options.js';
import type {Sound, SoundInput, SoundsFilter, SoundsLoopFilter, SoundsSort, WaveformSoundsInstanceEventMap, WaveformSoundsOptions, WaveformSoundsStrings} from '../types.js';

/** The engine `WaveformPlayer`, as far as the list uses it. */
interface Engine {
    audio: HTMLAudioElement | null;
    waveformData: number[];
    play(): unknown;
    pause(): unknown;
    seekTo(seconds: number): unknown;
    loadTrack(url: string, title: string, artist: string | null, options: EngineTrack): unknown;
    destroy(): unknown;
}

/** The `WaveformPlayer` class (`playerClass`, or the page's global). */
type EngineClass = new (container: HTMLElement, options: Record<string, any>) => Engine;

/** The elements the runtime drives (`_cacheRefs`). */
interface Refs {
    list: HTMLElement;
    search: HTMLInputElement | null;
    bpmMin: HTMLInputElement | null;
    bpmMax: HTMLInputElement | null;
    bpmRange: HTMLElement | null;
    bpmReadout: HTMLElement | null;
    bpmClear: HTMLElement | null;
    bpmLabel: HTMLElement | null;
    loop: HTMLElement | null;
    count: HTMLElement | null;
    empty: HTMLElement | null;
    more: HTMLElement | null;
    engine: HTMLElement | null;
    status: HTMLElement | null;
    chips: HTMLElement[];
    loopFilter: HTMLElement[];
}

/** The public fields are readonly to callers; the class itself writes them
 *  through this (a cast: it emits nothing). */
type Writable<T> = {-readonly [K in keyof T]: T[K]};

export {DEFAULT_OPTIONS};

/** An empty filter: everything matches. */
const NO_FILTER: Readonly<SoundsFilter> = Object.freeze({query: '', type: '', key: '', bpmMin: '', bpmMax: '', loop: ''});

/** Debounce for typing in the search box and the BPM fields (ms). */
const SEARCH_DELAY = 120;
const BPM_DELAY = 200;

/** Debounce before the address is rewritten after a change (ms). */
const URL_DELAY = 250;

/**
 * Typed listeners for the events a list dispatches on itself (see
 * {@link WaveformSoundsInstanceEventMap}). Types only: merged into the class
 * below, it emits nothing.
 */
export interface WaveformSounds {
    addEventListener<K extends keyof WaveformSoundsInstanceEventMap>(type: K, listener: (this: WaveformSounds, ev: WaveformSoundsInstanceEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof WaveformSoundsInstanceEventMap>(type: K, listener: (this: WaveformSounds, ev: WaveformSoundsInstanceEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions): void;
}

/**
 * An `EventTarget`, like the core's player: each moment is dispatched on the
 * instance as a plain event (`ready`, `play`, `pause`, `end`, `filter`,
 * `error`), and on the container as a bubbling, composed
 * `waveformsounds:<name>` CustomEvent carrying the details.
 */
// biome-ignore lint/suspicious/noUnsafeDeclarationMerging: see the interface above
export class WaveformSounds extends EventTarget {
    /** Every live instance, by its element. */
    static instances: Map<Element, WaveformSounds> = new Map();
    /** The pure helpers, for `<script>` users (attached in `entry.ts`). */
    declare static utils: {
        encodePeaks: typeof encodePeaks;
        decodePeaks: typeof decodePeaks;
        normalizeKey: typeof normalizeKey;
        normalizeSounds: typeof normalizeSounds;
        parseManifest: typeof parseManifest;
        facets: typeof facets;
        matches: typeof matches;
        sortSounds: typeof sortSounds;
        formatDuration: typeof formatDuration;
        renderSounds: typeof renderSounds;
    };
    /** Register the `<waveform-sounds>` element (default tag name
     *  `waveform-sounds`). The default entry does this on import; this
     *  reaches it from a `<script>` page that opted out of auto-init.
     *  Attached in `entry.ts`. Since 2.1.0. */
    declare static defineElement: (name?: string) => CustomElementConstructor | undefined;
    /** Every option with its default (attached in `entry.ts`). */
    declare static DEFAULT_OPTIONS: WaveformSoundsOptions;
    /** The English UI strings (attached in `entry.ts`). */
    declare static DEFAULT_STRINGS: WaveformSoundsStrings;

    declare readonly container: HTMLElement;
    declare readonly options: Required<WaveformSoundsOptions>;
    /** Resolves once the list is built (after a manifest fetch, if any).
     *  The build always happens after the constructor returns, so listeners
     *  attached straight after `new WaveformSounds()` see `ready`. It never
     *  rejects: a failed build (e.g. the manifest 404s) resolves it too and
     *  is reported through `onError` / `waveformsounds:error`. Calls made
     *  before it resolves are honoured: `setFilter`/`setSort` show in the
     *  controls once built, and `play()` waits for the list. */
    declare readonly ready: Promise<void>;
    declare readonly sounds: Sound[];
    declare readonly filter: SoundsFilter;
    declare readonly sortBy: SoundsSort;
    declare readonly playing: boolean;
    /** The engine `WaveformPlayer`: built when the list is ready if the
     *  player is on the page (else on first play), null before and after. */
    declare readonly engine: WaveformPlayer | null;

    /** @internal */ declare strings: WaveformSoundsStrings;
    /** @internal */ declare render: RenderOptions;
    /** @internal */ declare rows: HTMLElement[];
    /** @internal */ declare limit: number;
    /** @internal */ declare currentIndex: number | null;
    /** @internal */ declare progress: number;
    /** @internal */ declare loop: boolean;
    /** @internal */ declare menus: Menus | null;
    /** @internal */ declare destroyed: boolean;
    /** @internal Unset until the list is built; code that can run before checks it. */
    declare $: Refs;
    /** @internal */ declare colors: {wave: string, progress: string} | undefined;
    /** @internal */ declare _ctl: AbortController;
    /** @internal */ declare _originalHTML: string | null;
    /** @internal Adopted server markup as it arrived (destroy({restore})). */ declare _adoptedHTML: string | undefined;
    /** @internal */ declare _pendingSeek: number | null;
    /** @internal */ declare _raf: number;
    /** @internal */ declare _addedClasses: string[] | undefined;
    /** @internal */ declare _loopSet: boolean | undefined;
    /** @internal */ declare _sortSet: boolean | undefined;
    /** @internal */ declare _bpmExtent: {min: number, max: number} | null;
    /** @internal What the sounds offer the controls (built once). */ declare _facets: ReturnType<typeof facets> | undefined;
    /** @internal */ declare _sorts: string[];
    /** @internal */ declare _lastSort: string | undefined;
    /** @internal */ declare _lastPointer: string | undefined;
    /** @internal Rows drawn at least once. */ declare _drawn: Set<number> | undefined;
    /** @internal Drawn rows whose picture is stale (redrawn when they show). */ declare _dirty: Set<number> | undefined;
    /** @internal Rows near the viewport (undefined without IntersectionObserver). */ declare _onScreen: Set<number> | undefined;
    /** @internal */ declare _io: IntersectionObserver | undefined;
    /** @internal */ declare _ro: ResizeObserver | undefined;
    /** @internal */ declare _mo: MutationObserver | undefined;
    /** @internal */ declare _autoSurface: boolean | undefined;
    /** @internal */ declare _urlTimer: number | undefined;
    /** @internal */ declare _cued: boolean | undefined;
    /** @internal The sounds the last layout shows, in order (see `visible`). */ declare _shown: Sound[] | undefined;
    /** @internal The engine's own `preload` (a cue uses 'none'). */ declare _preload: string | undefined;
    /** @internal The row holding the list's one Tab stop. */ declare _active: HTMLElement | null;
    /** @internal The sound last reported as playing (its pause not yet reported). */ declare _announced: number | null | undefined;

    /**
     * @param {HTMLElement|string} container - The element (or a selector).
     * @param {WaveformSoundsOptions} [options]
     */
    constructor(container: HTMLElement | string, options: WaveformSoundsOptions = {}) {
        super();
        const el = typeof container === 'string' ? document.querySelector<HTMLElement>(container) : container;
        if (!el) throw new Error(`${LOG} Container not found: ${container}`);
        this.container = el;
        // Precedence, as across the family: data-* > constructor > default.
        // A <waveform-sounds> element reads its plain attributes too.
        const data = (el as {_wsOptions?: () => Record<string, any>})._wsOptions?.() ?? readDataOptions(el);
        this.options = mergeOptions(DEFAULT_OPTIONS, options, data) as Required<WaveformSoundsOptions>;
        this.options.waveformStyle = this.options.waveformStyle === 'bars' ? 'bars' : 'mirror';
        this.strings = {...DEFAULT_STRINGS, ...(this.options.strings || {})};
        this.render = {...resolveRenderOptions(this.options), strings: this.strings};

        this.sounds = [];
        this.rows = [];
        this.filter = {...NO_FILTER};
        this.sortBy = 'default';
        this.limit = this._pageSize();
        this.currentIndex = null;
        this.playing = false;
        this.progress = 0;
        this.loop = !!this.options.loop;
        this.engine = null;
        this.menus = null;
        this.destroyed = false;
        this._ctl = new AbortController();
        this._originalHTML = null;
        this._pendingSeek = null;
        this._raf = 0;

        WaveformSounds.instances.set(el, this);
        el.dataset.wsInitialized = 'true';
        // Build on a later microtask, never inside the constructor: ready /
        // filter events (and onReady) must reach listeners attached right
        // after `new WaveformSounds()`, and `this.ready` must already exist
        // when they fire. It never rejects: a failed build is reported
        // through onError / `waveformsounds:error`.
        /** Resolves once the list is built (after a manifest fetch, if any). */
        this.ready = Promise.resolve().then(() => this._init()).catch((err) => {
            if (this.destroyed) return; // e.g. the manifest fetch, aborted by destroy()
            console.error(`${LOG} Failed to initialise:`, err);
            this._showLoadError();
            this._emit('error', {error: err});
            this.options.onError?.(err, this);
        });
    }

    /* ── Setup ─────────────────────────────────────────────────────────── */

    /**
     * Adopt server-rendered markup or render it (from `sounds` or a fetched
     * manifest), then wire everything up.
     * @internal
     */
    async _init(): Promise<void> {
        const el = this.container;
        const adopted = el.querySelector<HTMLElement>('[data-ws-list]');
        if (adopted) {
            // As the server sent it, for destroy({restore: true}).
            this._adoptedHTML = el.innerHTML;
            (this as Writable<WaveformSounds>).sounds = readRows(adopted);
        } else {
            this._originalHTML = el.innerHTML;
            (this as Writable<WaveformSounds>).sounds = await this._loadSounds();
            if (this.destroyed) return;
            el.innerHTML = renderSounds(this.sounds as SoundInput[], {...this.render, idPrefix: this.options.idPrefix || el.id || undefined});
        }
        if (this.destroyed) return;

        // Remember which classes WE add, so destroy() takes back exactly
        // those (server-rendered markup already carries them).
        this._addedClasses = ['waveform-sounds', `waveform-sounds--${this.render.player}`].filter((c) => !el.classList.contains(c));
        el.classList.add(...this._addedClasses);

        this._facets = facets(this.sounds, this.render);
        this._cacheRefs();
        this._bind();
        this._observe();
        this._resolveColors();
        // Unless set (option or an early setLoop()), Loop starts on exactly
        // when the list marks loops — only those repeat.
        if (!this._loopSet) this.loop = loopsByDefault(this.options.loop, this._facets);
        this._setLoop(this.loop);
        this._bpmExtent = bpmExtent(this._facets.bpm);

        // The starting order is the first one offered, unless setSort()
        // already chose one; then the address may override both.
        this._sorts = availableSorts(this.render.sorts, this._facets);
        if (!this._sortSet) (this as Writable<WaveformSounds>).sortBy = (this._sorts[0] || 'default') as SoundsSort;
        this._readUrl();
        // A key set from code before now, in the list's spelling.
        (this as Writable<WaveformSounds>).filter = {...this.filter, key: this._keyEntry(this.filter.key)};
        // Show any filter/sort set before now (from code or the address).
        this._syncControls();
        this._apply({resort: this.sortBy !== 'default'});

        // Build the engine now (no audio loads until a play) when the
        // player is on the page, so anything that hooks players on their
        // `waveformplayer:ready` (waveform-tracker, analytics) is attached
        // BEFORE the first play — built on first play, that sound went
        // untracked.
        if (this._playerClass()) this._ensureEngine();
        // Strip: the docked player starts with the first sound cued — its
        // title and waveform, ready to play — rather than an empty frame.
        if (this.render.player === 'strip' && this.engine && this.currentIndex == null) this._cueFirst();

        this._emit('ready', {sounds: this.sounds.length});
        this.options.onReady?.(this);
    }

    /**
     * The sounds from the `sounds` option, else the `manifest` URL.
     * @internal
     */
    async _loadSounds(): Promise<Sound[]> {
        if (this.options.sounds || !this.options.manifest) return normalizeSounds(this.options.sounds || []);
        const url = this.options.manifest;
        // destroy() aborts it: a list torn down mid-fetch never builds.
        const res = await fetch(url, {signal: this._ctl.signal});
        if (!res.ok) throw new Error(`${LOG} Manifest ${url}: HTTP ${res.status}`);
        const manifest = await res.json();
        // Not a list of sounds at all is a broken manifest, not an empty pack.
        if (!Array.isArray(manifest) && !Array.isArray(manifest?.sounds)) throw new Error(`${LOG} Manifest ${url}: no "sounds" list`);
        return parseManifest(manifest);
    }

    /**
     * A build that failed (the manifest 404s, isn't JSON, isn't a manifest)
     * says so where the list would be — unless the container holds the
     * site's own fallback, which stays. destroy() restores what was there.
     * @internal
     */
    _showLoadError(): void {
        const el = this.container;
        if (this.$ || el.querySelector('*')) return;
        this._originalHTML ??= el.innerHTML;
        el.innerHTML = h('p', {class: 'ws-empty ws-load-error', role: 'alert', 'data-ws-load-error': true}, text(this.strings.loadError));
    }

    /**
     * Look up the elements the runtime drives.
     * @internal
     */
    _cacheRefs() {
        const q = <T extends HTMLElement = HTMLElement>(sel: string) => this.container.querySelector<T>(sel);
        this.$ = {
            list: q('[data-ws-list]')!,
            search: q<HTMLInputElement>('[data-ws-search]'),
            bpmMin: q<HTMLInputElement>('[data-ws-bpm-min]'),
            bpmMax: q<HTMLInputElement>('[data-ws-bpm-max]'),
            bpmRange: q('[data-ws-bpm-range]'),
            bpmReadout: q('[data-ws-bpm-readout]'),
            bpmClear: q('[data-ws-bpm-clear]'),
            bpmLabel: q('[data-ws-menu="bpm"] [data-ws-menu-value]'),
            loop: q('[data-ws-loop]'),
            count: q('[data-ws-count]'),
            empty: q('[data-ws-empty]'),
            more: q('[data-ws-more]'),
            engine: q('[data-ws-engine]'),
            status: q('[data-ws-status]'),
            chips: [...this.container.querySelectorAll<HTMLElement>('[data-ws-type]')],
            loopFilter: [...this.container.querySelectorAll<HTMLElement>('[data-ws-loop-filter]')],
        };
        this.rows = indexRows(this.$.list);
        // Roving tabindex: the list is ONE Tab stop (the active row's
        // controls); ↑/↓ move between rows. Set here, not in the markup, so
        // server-rendered HTML from any version gets it.
        this._active = null;
        for (const row of this.rows) if (row) this._rowStops(row, false);
    }

    /**
     * Make a row's own controls (play, download, and the seek slider when it
     * is the current sound) Tab stops, or not.
     * @internal
     */
    _rowStops(row: HTMLElement, on: boolean): void {
        const play = row.querySelector<HTMLElement>('.ws-play');
        if (play) play.tabIndex = on ? 0 : -1;
        const dl = row.querySelector<HTMLElement>('.ws-download');
        if (dl) dl.tabIndex = on ? 0 : -1;
        const wave = row.querySelector<HTMLElement>('.ws-wave');
        if (wave) wave.tabIndex = on && Number(row.dataset.wsIndex) === this.currentIndex ? 0 : -1;
    }

    /**
     * Move the list's Tab stop to `row` (roving tabindex).
     * @internal
     */
    _rove(row: HTMLElement | null | undefined): void {
        if (!row || row === this._active) return;
        if (this._active) this._rowStops(this._active, false);
        this._active = row;
        this._rowStops(row, true);
    }

    /**
     * Every listener. All are removed by `destroy()` through one
     * AbortController.
     * @internal
     */
    _bind() {
        const sig = {signal: this._ctl.signal};
        const $ = this.$;
        const root = this.container;

        root.addEventListener('click', (e) => this._onClick(e), sig);
        root.addEventListener('pointerdown', (e) => this._onPointerDown(e), sig);
        root.addEventListener('keydown', (e) => this._onKey(e), sig);
        // Whatever row gets focus (arrows, a click, a script) holds the Tab stop.
        $.list.addEventListener('focusin', (e) => this._rove((e.target as Element).closest<HTMLElement>('[data-ws-index]')), sig);

        let searchTimer = 0, bpmTimer = 0;
        $.search?.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => this.setFilter({query: $.search!.value}), SEARCH_DELAY);
        }, sig);
        $.search?.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); this._focusRow(visibleRows($.list)[0]); }
            if (e.key === 'Escape' && $.search!.value) { e.preventDefault(); $.search!.value = ''; this.setFilter({query: ''}); }
        }, sig);
        // The BPM handles: the label and the track follow the drag at once;
        // the list re-filters once it settles. A handle can't pass the other.
        const onBpm = (moved: HTMLInputElement) => {
            const lo = Number($.bpmMin!.value), hi = Number($.bpmMax!.value);
            if (lo > hi) moved.value = String(moved === $.bpmMin ? hi : lo);
            const f = bpmFilterFromRange(Number($.bpmMin!.value), Number($.bpmMax!.value), this._bpmExtent!);
            this._showBpm(f);
            clearTimeout(bpmTimer);
            bpmTimer = setTimeout(() => this.setFilter(f), BPM_DELAY);
        };
        $.bpmMin?.addEventListener('input', () => onBpm($.bpmMin!), sig);
        $.bpmMax?.addEventListener('input', () => onBpm($.bpmMax!), sig);
        $.bpmClear?.addEventListener('click', () => {
            clearTimeout(bpmTimer);
            this.setFilter({bpmMin: '', bpmMax: ''});
        }, sig);

        this.menus = new Menus(root, {
            signal: this._ctl.signal,
            onPick: (name, value) => (name === 'sort' ? this.setSort(value as SoundsSort) : this.setFilter({[name]: value})),
        });

        // Any OTHER player starting pauses the list (every WaveformPlayer's
        // play event bubbles to the document). The engine's singlePlay only
        // reaches players that also use singlePlay — a WaveformBar's player
        // doesn't, so without this the bar and the list could play at once.
        document.addEventListener('waveformplayer:play', (e: Event) => {
            const player = (e as CustomEvent).detail?.player;
            if (player && player !== this.engine && this.playing) this.pause();
        }, sig);
    }

    /* ── Input ────────────────────────────────────────────────────────── */

    /**
     * Clicks: type chips, loops or one-shots, Show more, Clear, Loop, a touch tap on a waveform
     * (seek), and anywhere else on a row (play/pause).
     * @internal
     */
    _onClick(e: MouseEvent): void {
        const t = e.target as Element;
        const chip = t.closest<HTMLElement>('[data-ws-type]');
        if (chip) { this.setFilter({type: chip.dataset.wsType}); return; }
        const seg = t.closest<HTMLElement>('[data-ws-loop-filter]');
        if (seg) { this.setFilter({loop: seg.dataset.wsLoopFilter as SoundsLoopFilter}); return; }
        if (t.closest('[data-ws-more]')) { this._showMoreFromButton(); return; }
        if (t.closest('[data-ws-clear]')) {
            // The button disappears with the empty state: focus goes back
            // to the search (else the first row), never to <body>.
            this.clearFilters();
            if (this.$.search) this.$.search.focus();
            else this._focusRow(visibleRows(this.$.list)[0]);
            return;
        }
        if (t.closest('[data-ws-loop]')) { this.setLoop(!this.loop); return; }
        const wave = t.closest<HTMLElement>('.ws-wave');
        if (wave) {
            // Touch seeks on the TAP (this click): its press may have been
            // the start of a scroll.
            if (this._lastPointer === 'touch') this._seekAt(wave, e.clientX);
            return;
        }
        const row = t.closest<HTMLElement>('[data-ws-index]');
        if (!row || t.closest('.ws-download')) return;
        this.toggle(Number(row.dataset.wsIndex));
        this._focusRowQuietly(row);
    }

    /**
     * "Show more", pressed: reveal the next page. When that was the last page
     * the button hides, so focus moves to the first row it revealed rather
     * than falling to <body>.
     * @internal
     */
    _showMoreFromButton(): void {
        const before = new Set(visibleRows(this.$.list));
        this.showMore();
        if (this.$.more?.hidden) this._focusRow(visibleRows(this.$.list).find((r) => !before.has(r)));
    }

    /**
     * Mouse and pen seek on PRESS, like every scrubber. Remembers the
     * pointer type for the click that follows.
     * @internal
     */
    _onPointerDown(e: PointerEvent): void {
        this._lastPointer = e.pointerType;
        const wave = (e.target as Element).closest<HTMLElement>('.ws-wave');
        if (!wave || e.button !== 0 || e.pointerType === 'touch') return;
        e.preventDefault();
        this._seekAt(wave, e.clientX);
    }

    /**
     * Seek (or start) a row's sound where its waveform was pressed.
     * @internal
     */
    _seekAt(wave: HTMLElement, clientX: number): void {
        const row = wave.closest<HTMLElement>('[data-ws-index]')!;
        this._seekRow(Number(row.dataset.wsIndex), pointerFraction(clientX, wave.getBoundingClientRect()));
        this._focusRowQuietly(row);
    }

    /**
     * Keys on the list: `/` focuses search; ↑/↓/Home/End move between rows
     * (auditioning while something plays); ←/→ seek the playing row, and on
     * its seek slider Home/End seek to the start/end.
     * @internal
     */
    _onKey(e: KeyboardEvent): void {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.key === '/' && !isTyping(e.target as Element | null) && this.$.search) {
            e.preventDefault();
            this.$.search.focus();
            return;
        }
        const row = (e.target as Element).closest?.<HTMLElement>('[data-ws-index]');
        if (!row) return;

        const index = Number(row.dataset.wsIndex);
        // On the seek slider, Home / End seek (the slider pattern) rather
        // than jump to the first / last row.
        const edge = (e.target as Element).closest('.ws-wave') ? sliderEdgeTarget(e.key) : null;
        const seek = edge ?? seekTarget(this.progress, e.key);
        if (seek !== null) {
            if (index !== this.currentIndex || !this.engine) return;
            e.preventDefault();
            this._seekRow(index, seek);
            return;
        }

        const rows = visibleRows(this.$.list);
        const target = rowTarget(e.key, rows.indexOf(row), rows.length);
        if (target === null) return;
        e.preventDefault();
        if (target === 'search') { this.$.search?.focus(); return; }
        this._focusRow(rows[target]);
        if (this.options.arrowAudition && this.playing) this.play(Number(rows[target].dataset.wsIndex));
    }

    /**
     * Focus a row's play button.
     * @internal
     */
    _focusRow(row: HTMLElement | null | undefined): void {
        row?.querySelector<HTMLElement>('.ws-play')?.focus();
    }

    /**
     * After a mouse or touch play, put focus on that row's play button so
     * the arrow keys drive the list instead of scrolling the page (a click
     * on the title or waveform left focus on <body>, and Safari never
     * focuses a clicked button). No scroll jump, and no focus ring: the
     * browser shows none for a focus that follows a pointer.
     * @internal
     */
    _focusRowQuietly(row: HTMLElement | null | undefined): void {
        const btn = row?.querySelector<HTMLElement>('.ws-play');
        if (btn && document.activeElement !== btn) btn.focus({preventScroll: true});
    }

    /* ── Drawing & colours ────────────────────────────────────────────── */

    /**
     * Draw row canvases as they scroll into view; redraw on resize and on
     * theme flips (the canvas can't follow CSS by itself).
     * @internal
     */
    _observe(): void {
        if (this.render.player !== 'inline' || typeof window === 'undefined') return;
        this._drawn = new Set();
        this._dirty = new Set();
        if ('IntersectionObserver' in window) {
            // Rows near the viewport. A row is drawn the first time it comes
            // near, and again only if it went stale (a resize or a theme flip
            // while it was away): a long list scrolled back and forth
            // repaints nothing it doesn't have to.
            this._onScreen = new Set();
            this._io = new IntersectionObserver((entries) => {
                for (const entry of entries) {
                    const i = Number((entry.target as HTMLElement).dataset.wsIndex);
                    if (!entry.isIntersecting) { this._onScreen!.delete(i); continue; }
                    this._onScreen!.add(i);
                    if (this._drawn!.has(i) && !this._dirty!.has(i)) continue;
                    this._drawn!.add(i);
                    this._drawRow(i);
                }
            }, {rootMargin: '200px 0px'});
            this.rows.forEach((r) => r && this._io!.observe(r));
        } else {
            this.rows.forEach((r, i) => r && this._drawn!.add(i));
        }
        if ('ResizeObserver' in window) {
            let width = 0;
            this._ro = new ResizeObserver(([entry]) => {
                const w = Math.round(entry.contentRect.width);
                if (w === width) return;
                width = w;
                this._redrawAll();
            });
            this._ro.observe(this.$.list);
        }
        let queued = 0;
        const refresh = () => {
            if (queued) return;
            // A style change on an ancestor can be anything (an animation,
            // a layout tweak): redraw only if the canvas colours moved.
            queued = requestAnimationFrame(() => { queued = 0; if (this._resolveColors()) this._redrawAll(); });
        };
        // A theme can flip on ANY ancestor (a dark section, a themed card,
        // a framework's root div), not just <html> / <body>. The container
        // itself counts for class and theme, not style: the runtime writes
        // --ws-surface there.
        this._mo = new MutationObserver(refresh);
        this._mo.observe(this.container, {attributes: true, attributeFilter: ['class', 'data-theme', 'data-color-scheme']});
        for (const node of ancestorsOf(this.container)) {
            this._mo.observe(node, {attributes: true, attributeFilter: ['class', 'data-theme', 'data-color-scheme', 'style']});
        }
        for (const query of ['(prefers-color-scheme: dark)', '(forced-colors: active)']) {
            try {
                window.matchMedia(query).addEventListener('change', refresh, {signal: this._ctl.signal});
            } catch { /* no matchMedia */ }
        }
    }

    /**
     * Resolve the canvas colours (options, else the CSS custom properties;
     * system colours under forced colours) and keep `--ws-surface` current
     * unless the site set it.
     * @returns Whether the canvas colours changed.
     * @internal
     */
    _resolveColors(): boolean {
        const before = this.colors;
        if (this._autoSurface || !getComputedStyle(this.container).getPropertyValue('--ws-surface').trim()) {
            this._autoSurface = true;
            this.container.style.removeProperty('--ws-surface');
            this.container.style.setProperty('--ws-surface', pageSurface(this.container));
        }
        // Forced colours: the system's own text and highlight, whatever the
        // options or the CSS say (as every other part of the list does).
        const forced = forcedColors();
        this.colors = {
            wave: (forced ? resolveCssColor(this.container, 'CanvasText') : this.options.waveformColor || resolveCssColor(this.container, 'var(--ws-wave-color)')) || 'rgba(128,128,128,.5)',
            progress: (forced ? resolveCssColor(this.container, 'Highlight') : this.options.progressColor || resolveCssColor(this.container, 'var(--ws-progress-color)')) || 'currentColor',
        };
        return !before || before.wave !== this.colors.wave || before.progress !== this.colors.progress;
    }

    /**
     * Draw one row's waveform (only once it has been on screen).
     * @internal
     */
    _drawRow(index: number | null | undefined): void {
        if (this.render.player !== 'inline' || index == null || !this._drawn?.has(index)) return;
        const row = this.rows[index];
        const canvas = row?.querySelector('canvas');
        if (!canvas) return;
        // Hidden (filtered, or past the page): draw it when it shows again.
        if (row.hidden) { this._dirty?.add(index); return; }
        this._dirty?.delete(index);
        const gap = Number(this.options.barGap);
        drawRowWaveform(canvas, this.sounds[index].peaks, index === this.currentIndex ? this.progress : 0, {
            style: this.options.waveformStyle,
            color: this.colors?.wave || 'rgba(128,128,128,.5)',
            progressColor: this.colors?.progress || 'currentColor',
            barWidth: Math.max(1, Number(this.options.barWidth) || 2),
            barGap: Number.isFinite(gap) ? Math.max(0, gap) : 1,
        });
    }

    /**
     * After a resize or a theme flip: redraw the rows on screen now, and
     * mark the rest stale — each is redrawn when it scrolls back in. (With
     * 1000 rows drawn, redrawing them all took ~0.4s in Chrome and ~1.9s in
     * WebKit per resize step.)
     * @internal
     */
    _redrawAll(): void {
        this._drawn?.forEach((i) => {
            if (this._onScreen && !this._onScreen.has(i)) this._dirty!.add(i);
            else this._drawRow(i);
        });
    }

    /* ── Filters in the address ───────────────────────────────────────── */

    /**
     * Apply the filter and sort from the address (`urlState`).
     * @internal
     */
    _readUrl(): void {
        const keys = urlKeys(this.options.urlState);
        if (!keys || typeof location === 'undefined') return;
        const f = this._facets!;
        const {filter, sort} = readUrlState(location.search, keys, {...f, bpm: bpmExtent(f.bpm)}, this._sorts, this.render);
        (this as Writable<WaveformSounds>).filter = {...this.filter, ...filter};
        if (sort) { (this as Writable<WaveformSounds>).sortBy = sort as SoundsSort; this._sortSet = true; }
    }

    /**
     * Rewrite the address shortly after a change (replaceState: no history
     * entries).
     * @internal
     */
    _queueUrl(): void {
        const keys = urlKeys(this.options.urlState);
        if (!keys || typeof location === 'undefined') return;
        clearTimeout(this._urlTimer);
        this._urlTimer = setTimeout(() => {
            if (this.destroyed) return;
            const next = writeUrlState(location.href, keys, this.filter, this.sortBy, this._sorts?.[0] || 'default');
            if (next !== location.href) history.replaceState(history.state, '', next);
        }, URL_DELAY);
    }

    /* ── Filtering, sorting, paging ───────────────────────────────────── */

    /** The sounds that pass the filter, in the current sort order. */
    get visible(): Sound[] {
        // Laid out by the last _apply(), which runs on every filter or sort
        // change; computed afresh only before the list is built.
        return [...(this._shown ?? this._match())];
    }

    /**
     * Filter and sort the sounds now.
     * @internal
     */
    _match(): Sound[] {
        return sortSounds(this.sounds.filter((s) => matches(s, this.filter, this.render)), this.sortBy);
    }

    /**
     * A key filter in the list's own spelling: with enharmonic keys merged,
     * `A#m` on a list whose entry is `Bbm` becomes `Bbm` (so the menu and
     * the address show the entry). A key the list doesn't have stays as
     * given (it matches nothing, as before).
     * @internal
     */
    _keyEntry(key: string | undefined): string {
        const k = normalizeKey(key);
        return (this._facets && keyEntry(k, this._facets.keys, this.render.mergeEnharmonicKeys)) || k;
    }

    /**
     * Change the filter (merged into the current one) and re-apply. Back to
     * the first page.
     *
     * @param patch
     */
    // The public signature (as in 0.3.1's index.d.ts: `patch` required); the
    // implementation's default stays, and an overload signature emits nothing.
    setFilter(patch: Partial<SoundsFilter>): void;
    setFilter(patch: Partial<SoundsFilter> = {}): void {
        (this as Writable<WaveformSounds>).filter = {...this.filter, ...patch};
        if (patch.key) this.filter.key = this._keyEntry(patch.key);
        this.limit = this._pageSize();
        this._syncControls();
        this._apply({resort: false});
    }

    /** Reset every filter (the sort stays). */
    clearFilters(): void {
        this.setFilter(NO_FILTER);
    }

    /** @param by */
    setSort(by: SoundsSort): void {
        this._sortSet = true;
        (this as Writable<WaveformSounds>).sortBy = SORTS.includes(by) ? by : 'default';
        this.menus?.setValue('sort', this.sortBy);
        this._apply({resort: true});
    }

    /** Reveal the next page of results. */
    showMore(): void {
        if (this.limit === Infinity) return;
        this.limit += this.render.pageSize;
        this._apply({resort: false});
    }

    /**
     * Rows per page (Infinity when paging is off).
     * @internal
     */
    _pageSize(): number {
        return this.render.pageSize > 0 ? this.render.pageSize : Infinity;
    }

    /**
     * Show the current filter and sort in the controls (they can be set from
     * code or the address, not only by the controls themselves).
     * @internal
     */
    _syncControls(): void {
        const $ = this.$, f = this.filter;
        if (!$) return;
        if ($.search && $.search.value !== f.query) $.search.value = f.query;
        this.menus?.setValue('type', f.type || '');
        this.menus?.setValue('key', f.key || '');
        this.menus?.setValue('sort', this.sortBy);
        if ($.bpmMin && $.bpmMax && this._bpmExtent) {
            const {lo, hi} = bpmRangeFromFilter(f, this._bpmExtent);
            $.bpmMin.value = String(lo);
            $.bpmMax.value = String(hi);
            this._showBpm(f);
        }
        $.chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.wsType === (f.type || ''))));
        $.loopFilter.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.wsLoopFilter === (f.loop || ''))));
    }

    /**
     * Show a BPM filter in its menu: the button label, the panel's readout,
     * the filled part of the track, and which handle sits on top (the one
     * that can still move, when they meet).
     * @internal
     */
    _showBpm(f: {bpmMin?: string | number, bpmMax?: string | number}): void {
        const $ = this.$, extent = this._bpmExtent;
        if (!$?.bpmRange || !extent) return;
        const {lo, hi} = bpmRangeFromFilter(f, extent);
        if ($.bpmLabel) $.bpmLabel.textContent = bpmLabel(f, extent, this.strings);
        if ($.bpmReadout) $.bpmReadout.textContent = fill(this.strings.bpmRange, {min: lo, max: hi});
        // CSSOM, not a style attribute: works under a strict CSP.
        $.bpmRange.style.setProperty('--ws-lo', String(bpmFraction(lo, extent)));
        $.bpmRange.style.setProperty('--ws-hi', String(bpmFraction(hi, extent)));
        $.bpmRange.classList.toggle('is-min-top', lo >= hi && lo > extent.min);
        $.bpmRange.classList.toggle('is-active', lo > extent.min || hi < extent.max);
    }

    /**
     * Lay the rows out for the current filter, sort and page: order, hide,
     * "Show more", the empty state and the count. Then report it.
     *
     * @param opts - Reorder the rows even if the sort
     *   hasn't changed.
     * @internal
     */
    _apply({resort}: {resort: boolean}): void {
        const $ = this.$;
        if (!$) return;
        if (resort || this.sortBy !== this._lastSort) {
            // Each sound's row by identity: a Map, not indexOf per sound
            // (quadratic — 1000 sounds was a million comparisons a sort).
            const index = new Map(this.sounds.map((s, i) => [s, i]));
            orderRows($.list, sortSounds(this.sounds, this.sortBy).map((s) => this.rows[index.get(s)!]));
            this._lastSort = this.sortBy;
        }
        const shown = this._match();
        this._shown = shown;
        const {visible, remaining} = pageWindow(shown, this.limit);
        this.sounds.forEach((s, i) => { if (this.rows[i]) this.rows[i].hidden = !visible.has(s); });
        if ($.more) {
            $.more.hidden = remaining <= 0;
            $.more.textContent = fill(this.strings.showMore, {count: Math.min(remaining, this.render.pageSize || remaining)});
        }
        if ($.empty) {
            $.empty.hidden = shown.length > 0;
            // No sounds at all: nothing matches because there is nothing, and
            // there is no filter to clear.
            if (!this.sounds.length && $.empty.textContent !== this.strings.noSounds) $.empty.textContent = this.strings.noSounds;
        }
        if ($.count) $.count.textContent = countText(shown.length, this.sounds.length, this.strings);
        // The Tab stop never sits on a hidden row; and if focus was in the
        // row just filtered away, it follows the stop instead of falling
        // to <body>.
        if (!this._active || this._active.hidden) {
            const lost = !!this._active?.contains(document.activeElement);
            const first = visibleRows($.list)[0];
            if (first) {
                this._rove(first);
                if (lost) this._focusRowQuietly(first);
            } else if (this._active) { this._rowStops(this._active, false); this._active = null; }
        }
        // Nothing played yet: keep the cued sound one the list still shows.
        if (this._cued && !this.playing) this._cueFirst();
        this._queueUrl();
        this._emit('filter', {visible: shown.length, total: this.sounds.length, filter: {...this.filter}, sort: this.sortBy});
        this.options.onFilter?.(shown, this);
    }

    /* ── Playback ─────────────────────────────────────────────────────── */

    /**
     * Resolve an index, id or sound to an index in `this.sounds`. No
     * target means the current sound, else the first visible one.
     *
     * @param target
     * @internal
     */
    _indexOf(target?: number | string | Sound | null): number | null {
        if (target == null) {
            if (this.currentIndex != null) return this.currentIndex;
            const first = (this._shown ?? this._match())[0];
            return first ? this.sounds.indexOf(first) : null;
        }
        if (typeof target === 'number') return this.sounds[target] ? target : null;
        const i = typeof target === 'object' ? this.sounds.indexOf(target) : this.sounds.findIndex((s) => s.id === String(target));
        return i >= 0 ? i : null;
    }

    /**
     * The WaveformPlayer class: `playerClass`, else the page's global.
     * @internal
     */
    _playerClass(): EngineClass | null {
        return (this.options.playerClass || (typeof window !== 'undefined' ? (window as any).WaveformPlayer : null) || null) as EngineClass | null;
    }

    /**
     * The engine as the list drives it (fields the core keeps internal).
     * @internal
     */
    _eng(): Engine | null {
        return this.engine as unknown as Engine | null;
    }

    /**
     * The element the engine mounts into: a child of the engine slot, never
     * the slot itself. WaveformPlayer resets its container's `className`,
     * which would strip `ws-engine--strip` (and with it the docked styling).
     * Made here rather than in the markup so server-rendered HTML from any
     * version works.
     * @internal
     */
    _engineMount(): HTMLElement {
        const slot = this.$.engine!;
        let mount = slot.querySelector<HTMLElement>(':scope > [data-ws-engine-mount]');
        if (!mount) {
            mount = document.createElement('div');
            mount.setAttribute('data-ws-engine-mount', '');
            slot.appendChild(mount);
        }
        return mount;
    }

    /**
     * Build the engine once (it holds no audio until a play).
     * @returns The engine, or null without a player class.
     * @internal
     */
    _ensureEngine(): Engine | null {
        if (this.engine) return this._eng();
        const Player = this._playerClass();
        if (!Player) {
            console.error(`${LOG} @arraypress/waveform-player is required: load it before playing (or pass playerClass).`);
            return null;
        }
        const options = engineOptions(this.options.playerOptions, this.render.player, {
            onLoad: () => this._onEngineLoad(),
            onPlay: () => this._setPlaying(true),
            onPause: () => this._setPlaying(false),
            onEnd: () => this._onEnd(),
            onTimeUpdate: (time: number, duration: number) => this._onTime(time, duration),
            onError: (err: unknown) => this._onEngineError(err),
        });
        this._preload = options.preload;
        (this as Writable<WaveformSounds>).engine = new Player(this._engineMount(), options) as unknown as WaveformPlayer;
        return this._eng();
    }

    /**
     * Play a sound (by index, id or sound object), or resume the current
     * one. Before the list is built the call waits for it.
     *
     * @param target
     * @param opts - `at`: start position 0..1.
     */
    play(target?: number | string | Sound, opts: {at?: number} = {}): void {
        if (!this.$) { this.ready.then(() => { if (!this.destroyed) this.play(target, opts); }); return; }
        const index = this._indexOf(target);
        if (index == null) return;
        this._cued = false;
        const engine = this._ensureEngine();
        if (!engine) return;
        if (index === this.currentIndex && engine.audio?.src) {
            if (opts.at != null) this._seekRow(index, opts.at);
            if (!this.playing) engine.play();
            return;
        }
        const previous = this.currentIndex;
        this.currentIndex = index;
        this.progress = 0;
        this._pendingSeek = opts.at ?? null;
        if (previous != null) this._paintRow(previous);
        this._paintRow(index);
        const sound = this.sounds[index];
        engine.loadTrack(sound.url, sound.title, sound.type || null, engineTrack(sound, this.render.player, true, this._preload));
    }

    /**
     * Strip layout: load the first sound the list shows into the docked
     * player WITHOUT playing it, so the player shows a title and waveform
     * (and its play button plays that sound) instead of an empty frame.
     * Nothing is fetched (`preload: 'none'`): the player shows the title,
     * length and peaks from the data, and the audio loads on play — a filter
     * change re-cues, and each cue used to fetch a file's metadata.
     * The row isn't marked current until it plays.
     * @internal
     */
    _cueFirst(): void {
        const engine = this._eng();
        const first = (this._shown ?? this._match())[0];
        if (!engine || !first) return;
        const index = this.sounds.indexOf(first);
        if (index === this.currentIndex) return;
        this.currentIndex = index;
        this.progress = 0;
        this._cued = true;
        // Firefox fetches a source set in the same task as a script's
        // load(), whatever `preload` says — and the core's loadTrack() resets
        // the element with load() before setting the new source. Nothing
        // plays yet, so that reset can go: setting `src` (which the core
        // does too) restarts the element's load on its own.
        const audio = engine.audio;
        const shim = audio && typeof audio.load === 'function';
        if (shim) audio!.load = () => {};
        try {
            engine.loadTrack(first.url, first.title, first.type || null, engineTrack(first, 'strip', false, 'none'));
        } finally {
            if (shim) delete (audio as Partial<HTMLAudioElement>).load;
        }
    }

    /** Pause the current sound. */
    pause(): void {
        if (this.engine && this.playing) this._eng()!.pause();
    }

    /**
     * The current sound plays/pauses; another sound starts.
     * @param target
     */
    toggle(target?: number | string | Sound): void {
        const index = this._indexOf(target);
        if (index == null) return;
        if (index === this.currentIndex && this.playing) this.pause();
        else this.play(index);
    }

    /** Play the next visible sound (no wrap at the end). */
    next(): void { this._step(1); }

    /** Play the previous visible sound. */
    previous(): void { this._step(-1); }

    /**
     * Play the visible sound `dir` places away, revealing it if it's past
     * the current page.
     *
     * @param dir
     * @returns Whether there was one.
     * @internal
     */
    _step(dir: 1 | -1): boolean {
        const shown = this._shown ?? this._match();
        // A cued sound counts as nothing played: next() starts with it.
        const at = this.currentIndex == null || this._cued ? -1 : shown.indexOf(this.sounds[this.currentIndex]);
        const target = shown[at + dir];
        if (!target) return false;
        const limit = limitToReveal(this.limit, at + dir);
        if (limit !== this.limit) { this.limit = limit; this._apply({resort: false}); }
        this.play(this.sounds.indexOf(target));
        return true;
    }

    /**
     * Loop the current sound (auditioning a loop is the common case). When
     * the list marks its loops (`loop: true` on any sound), only those
     * repeat: a one-shot always plays once.
     * @param on
     */
    setLoop(on: boolean): void {
        this._loopSet = true;
        this.loop = !!on;
        this._setLoop(this.loop);
    }

    /**
     * Apply the loop state to the toggle and the engine.
     * @internal
     */
    _setLoop(on: boolean): void {
        this.$?.loop?.setAttribute('aria-pressed', String(on));
        if (this._eng()?.audio) this._eng()!.audio!.loop = this._repeats();
    }

    /**
     * Should the current sound repeat? The Loop toggle is on, and either
     * the list doesn't say which sounds are loops or this one is.
     * @internal
     */
    _repeats(): boolean {
        if (!this.loop) return false;
        const marksLoops = this.sounds.some((s) => s.loop);
        return !marksLoops || !!this.sounds[this.currentIndex!]?.loop;
    }

    /**
     * Seek a row's sound to `fraction`; a row that isn't current starts
     * there. Before the duration is known the seek waits for it.
     * @internal
     */
    _seekRow(index: number, fraction: number): void {
        if (index !== this.currentIndex || !this.engine) { this.play(index, {at: fraction}); return; }
        const duration = this._eng()!.audio?.duration;
        if (!Number.isFinite(duration) || duration! <= 0) { this._pendingSeek = fraction; return; }
        this._eng()!.seekTo(fraction * duration!);
        this.progress = fraction;
        this._paintRow(index);
        this._paintSlider();
        if (!this.playing) this._eng()!.play();
    }

    /**
     * The engine loaded a sound: clear an earlier failure, apply the loop, borrow decoded peaks for a
     * row that had none, and land a pending seek.
     * @internal
     */
    _onEngineLoad(): void {
        if (this.currentIndex != null) this.rows[this.currentIndex]?.classList.remove('is-error');
        if (this._eng()?.audio) this._eng()!.audio!.loop = this._repeats();
        const sound = this.sounds[this.currentIndex!];
        if (sound && !sound.peaks && this._eng()?.waveformData?.length) {
            sound.peaks = resample(this._eng()!.waveformData, 96);
            this._drawRow(this.currentIndex);
        }
        const duration = this._eng()?.audio?.duration;
        if (this._pendingSeek != null && Number.isFinite(duration) && duration! > 0) {
            this._eng()!.seekTo(this._pendingSeek * duration!);
            this.progress = this._pendingSeek;
            this._pendingSeek = null;
        }
    }

    /**
     * Playback progress: repaint the current row, once per frame.
     * @internal
     */
    _onTime(time: number, duration: number): void {
        if (this.currentIndex == null || !duration) return;
        if (this._pendingSeek != null) {
            const fraction = this._pendingSeek;
            this._pendingSeek = null;
            this._eng()!.seekTo(fraction * duration);
            return;
        }
        this.progress = Math.min(Math.max(time / duration, 0), 1);
        if (this._raf) return;
        this._raf = requestAnimationFrame(() => {
            this._raf = 0;
            this._drawRow(this.currentIndex);
            this._paintSlider();
        });
    }

    /**
     * A sound finished: report it, then auto-advance or settle.
     * @internal
     */
    _onEnd(): void {
        const sound = this.sounds[this.currentIndex!];
        this._emit('end', {sound, index: this.currentIndex});
        this.options.onEnd?.(sound, this);
        if (this.options.autoAdvance && this._step(1)) return;
        this.progress = 0;
        this._setPlaying(false);
    }

    /**
     * A sound failed to load or play: it isn't playing (no stale "Pause"),
     * its row is marked until it plays, and the live region says so.
     * @internal
     */
    _onEngineError(err: unknown): void {
        const index = this.currentIndex;
        const sound = index == null ? undefined : this.sounds[index];
        if (index != null) this.rows[index]?.classList.add('is-error');
        this._setPlaying(false);
        // A cued sound (strip, nothing played) wasn't asked for: no announcement.
        if (sound && !this._cued && this.$?.status) this.$.status.textContent = fill(this.strings.playError, {title: sound.title});
        this._emit('error', {error: err, sound, index});
        this.options.onError?.(err, this);
    }

    /**
     * Record play/pause and repaint, and report what the listener hears.
     * Events follow the SOUND, not the flag: switching sounds while one plays
     * (↓ audition, `play(i)`, `next()`, auto-advance) never flips `playing`
     * in some engines (the media element swaps source without a `pause`),
     * so the last sound announced is tracked — a different one starting
     * reports `pause` for the outgoing sound, then `play` for the new one.
     * At a natural end the browser fires `pause` then `ended`, and `_onEnd()`
     * settles the state again: one pause event, not two.
     * @internal
     */
    _setPlaying(on: boolean): void {
        (this as Writable<WaveformSounds>).playing = on;
        if (on) this._cued = false; // the strip's own button played the cued sound
        const index = this.currentIndex;
        if (index == null) return;
        if (on) this.rows[index]?.classList.remove('is-error'); // it plays after all
        this._paintRow(index);
        const was = this._announced ?? null;
        if (on) {
            if (was === index) return;
            if (was != null) this._announce('pause', was);
            this._announced = index;
            this._announce('play', index);
        } else if (was != null) {
            this._announced = null;
            this._announce('pause', was);
        }
    }

    /**
     * Report a sound starting or stopping: the live region (on play), the
     * `waveformsounds:play|pause` event and the `onPlay` / `onPause` callback.
     * @internal
     */
    _announce(type: 'play' | 'pause', index: number): void {
        const sound = this.sounds[index];
        if (!sound) return;
        if (type === 'play' && this.$?.status) this.$.status.textContent = fill(this.strings.nowPlaying, {title: sound.title});
        this._emit(type, {sound, index});
        (type === 'play' ? this.options.onPlay : this.options.onPause)?.(sound, this);
    }

    /* ── Row painting ─────────────────────────────────────────────────── */

    /**
     * A row's state classes, play-button label and waveform.
     * @internal
     */
    _paintRow(index: number): void {
        const row = this.rows[index];
        if (!row) return;
        const current = index === this.currentIndex;
        const on = current && this.playing;
        row.classList.toggle('is-current', current);
        row.classList.toggle('is-playing', on);
        const btn = row.querySelector('.ws-play');
        if (btn) {
            btn.setAttribute('aria-pressed', String(on));
            btn.setAttribute('aria-label', fill(on ? this.strings.pause : this.strings.play, {title: this.sounds[index].title}));
        }
        const wave = row.querySelector<HTMLElement>('.ws-wave');
        if (wave) {
            wave.tabIndex = current && row === this._active ? 0 : -1;
            if (!current) {
                wave.setAttribute('aria-valuenow', '0');
                wave.removeAttribute('aria-valuetext');
            }
        }
        this._drawRow(index);
    }

    /**
     * The current row's seek slider: its position (0–100) and, for a screen
     * reader, the time ("0:12 of 0:30").
     * @internal
     */
    _paintSlider(): void {
        const index = this.currentIndex;
        const wave = index == null ? null : this.rows[index]?.querySelector('.ws-wave');
        if (!wave) return;
        wave.setAttribute('aria-valuenow', String(Math.round(this.progress * 100)));
        const audio = this._eng()?.audio;
        const duration = Number.isFinite(audio?.duration) && audio!.duration > 0 ? audio!.duration : this.sounds[index!].duration;
        if (duration) wave.setAttribute('aria-valuetext', fill(this.strings.seekValue, {time: formatClock(this.progress * duration), duration: formatDuration(duration)}));
    }

    /* ── Events & lifecycle ──────────────────────────────────────────── */

    /**
     * Announce a moment both ways: a `waveformsounds:<name>` event on the
     * container carrying the details and this instance, then a plain `<name>`
     * event on the instance.
     * @internal
     */
    _emit(name: keyof WaveformSoundsInstanceEventMap, detail: Record<string, any> = {}): void {
        emit(this.container, name, {...detail, instance: this});
        this.dispatchEvent(new Event(name));
    }

    /** The sound playing (or paused) now, or null. */
    get current(): Sound | null {
        // A cued sound (strip, nothing played yet) isn't "current".
        return this.currentIndex == null || this._cued ? null : this.sounds[this.currentIndex];
    }

    /**
     * Tear down: listeners, observers, timers and the engine. Markup this
     * instance rendered is restored to what the container held before.
     * ADOPTED (server-rendered) markup is left as it is now — rows may be
     * re-sorted, hidden or marked current — unless `restore` is set: then it
     * is put back exactly as the server sent it, ready for a new instance
     * (what a framework re-mounting the same markup wants).
     *
     * @param options
     * @param options.restore - Put adopted server markup back as it was.
     *   Default false. Since 2.1.0.
     */
    destroy(options: {restore?: boolean} = {}): void {
        if (this.destroyed) return;
        this.destroyed = true;
        this._ctl.abort();
        this._io?.disconnect();
        this._ro?.disconnect();
        this._mo?.disconnect();
        if (this._raf) cancelAnimationFrame(this._raf);
        clearTimeout(this._urlTimer);
        try { this._eng()?.destroy(); } catch { /* engine already gone */ }
        (this as Writable<WaveformSounds>).engine = null;
        this.$?.engine?.querySelector(':scope > [data-ws-engine-mount]')?.remove();
        if (this._originalHTML != null) this.container.innerHTML = this._originalHTML;
        else if (options.restore && this._adoptedHTML != null) this.container.innerHTML = this._adoptedHTML;
        if (this._addedClasses?.length) this.container.classList.remove(...this._addedClasses);
        if (this._autoSurface) this.container.style.removeProperty('--ws-surface');
        delete this.container.dataset.wsInitialized;
        WaveformSounds.instances.delete(this.container);
    }

    /**
     * Initialise every `[data-waveform-sounds]` under `root` that isn't yet.
     *
     * @param root
     * @returns The new instances.
     */
    static init(root: ParentNode = document): WaveformSounds[] {
        if (typeof document === 'undefined') return [];
        const scope = root || document;
        const els = [...((scope as Element).matches?.('[data-waveform-sounds]') ? [scope as HTMLElement] : []), ...scope.querySelectorAll<HTMLElement>('[data-waveform-sounds]')];
        const created: WaveformSounds[] = [];
        for (const el of els) {
            if (el.dataset.wsInitialized === 'true' || WaveformSounds.instances.has(el)) continue;
            try { created.push(new WaveformSounds(el)); } catch (err) { console.error(`${LOG} Failed to initialise:`, err, el); }
        }
        return created;
    }

    /**
     * The instance on an element (or selector), if any.
     * @param el
     */
    static getInstance(el: Element | string): WaveformSounds | null {
        const node = typeof el === 'string' ? document.querySelector(el) : el;
        return node ? WaveformSounds.instances.get(node) || null : null;
    }

    /** Destroy instances whose element has left the document (after a
     *  client-side navigation). */
    static prune(): void {
        for (const [el, inst] of WaveformSounds.instances) if (!el.isConnected) inst.destroy();
    }
}
