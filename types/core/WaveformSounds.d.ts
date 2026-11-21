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
import { facets, formatDuration, matches, normalizeKey, normalizeSounds, parseManifest, sortSounds } from '../data/sounds.js';
import { DEFAULT_OPTIONS } from './options.js';
import type { renderSounds } from '../render/markup.js';
import type { decodePeaks, encodePeaks } from '../data/sounds.js';
import type { WaveformPlayer } from '@arraypress/waveform-player';
import type { Sound, SoundsFilter, SoundsSort, WaveformSoundsInstanceEventMap, WaveformSoundsOptions, WaveformSoundsStrings } from '../types.js';
export { DEFAULT_OPTIONS };
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
export declare class WaveformSounds extends EventTarget {
    /** Every live instance, by its element. */
    static instances: Map<Element, WaveformSounds>;
    /** The pure helpers, for `<script>` users (attached in `entry.ts`). */
    static utils: {
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
    static defineElement: (name?: string) => CustomElementConstructor | undefined;
    /** Every option with its default (attached in `entry.ts`). */
    static DEFAULT_OPTIONS: WaveformSoundsOptions;
    /** The English UI strings (attached in `entry.ts`). */
    static DEFAULT_STRINGS: WaveformSoundsStrings;
    readonly container: HTMLElement;
    readonly options: Required<WaveformSoundsOptions>;
    /** Resolves once the list is built (after a manifest fetch, if any).
     *  The build always happens after the constructor returns, so listeners
     *  attached straight after `new WaveformSounds()` see `ready`. It never
     *  rejects: a failed build (e.g. the manifest 404s) resolves it too and
     *  is reported through `onError` / `waveformsounds:error`. Calls made
     *  before it resolves are honoured: `setFilter`/`setSort` show in the
     *  controls once built, and `play()` waits for the list. */
    readonly ready: Promise<void>;
    readonly sounds: Sound[];
    readonly filter: SoundsFilter;
    readonly sortBy: SoundsSort;
    readonly playing: boolean;
    /** The engine `WaveformPlayer`: built when the list is ready if the
     *  player is on the page (else on first play), null before and after. */
    readonly engine: WaveformPlayer | null;
    /**
     * @param {HTMLElement|string} container - The element (or a selector).
     * @param {WaveformSoundsOptions} [options]
     */
    constructor(container: HTMLElement | string, options?: WaveformSoundsOptions);
    /** The sounds that pass the filter, in the current sort order. */
    get visible(): Sound[];
    /**
     * Change the filter (merged into the current one) and re-apply. Back to
     * the first page.
     *
     * @param patch
     */
    setFilter(patch: Partial<SoundsFilter>): void;
    /** Reset every filter (the sort stays). */
    clearFilters(): void;
    /** @param by */
    setSort(by: SoundsSort): void;
    /** Reveal the next page of results. */
    showMore(): void;
    /**
     * Play a sound (by index, id or sound object), or resume the current
     * one. Before the list is built the call waits for it.
     *
     * @param target
     * @param opts - `at`: start position 0..1.
     */
    play(target?: number | string | Sound, opts?: {
        at?: number;
    }): void;
    /** Pause the current sound. */
    pause(): void;
    /**
     * The current sound plays/pauses; another sound starts.
     * @param target
     */
    toggle(target?: number | string | Sound): void;
    /** Play the next visible sound (no wrap at the end). */
    next(): void;
    /** Play the previous visible sound. */
    previous(): void;
    /**
     * Loop the current sound (auditioning a loop is the common case). When
     * the list marks its loops (`loop: true` on any sound), only those
     * repeat: a one-shot always plays once.
     * @param on
     */
    setLoop(on: boolean): void;
    /** The sound playing (or paused) now, or null. */
    get current(): Sound | null;
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
    destroy(options?: {
        restore?: boolean;
    }): void;
    /**
     * Initialise every `[data-waveform-sounds]` under `root` that isn't yet.
     *
     * @param root
     * @returns The new instances.
     */
    static init(root?: ParentNode): WaveformSounds[];
    /**
     * The instance on an element (or selector), if any.
     * @param el
     */
    static getInstance(el: Element | string): WaveformSounds | null;
    /** Destroy instances whose element has left the document (after a
     *  client-side navigation). */
    static prune(): void;
}
//# sourceMappingURL=WaveformSounds.d.ts.map