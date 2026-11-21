import type { Sound, SoundInput, SoundsFilter, SoundsManifest, SoundsSort } from '../types.js';
/**
 * Pure data helpers: no DOM, no window. Shared by the browser runtime and
 * the server renderer (`@arraypress/waveform-sounds/render`), so a wrapper
 * that renders the list on the server produces exactly what the client
 * would.
 *
 * @module data
 */
/**
 * Peaks travel as an 8-bit hex string, two characters per bar ("00"–"ff").
 * A sound browser draws ~48–64 bars per row, so that is ~100 characters a
 * sound: 300 sounds is ~30 KB in a manifest or in row attributes, against
 * ~3x that as a JSON number array.
 *
 * @param peaks - Values 0..1.
 * @returns Hex string.
 */
export declare function encodePeaks(peaks: number[]): string;
/**
 * Decode peaks from any accepted form into numbers 0..1.
 *
 * Accepts the hex string from {@link encodePeaks}, the player's compact
 * `wp1:` string (`"wp1:"` + base64url of one byte per peak, what the 2.0
 * core and waveform-gen write), an array of 0..1 numbers, or an array of
 * integers on a larger scale (e.g. 0..100 or 0..255) together with that
 * `scale`. Server markup still writes hex.
 *
 * @param value
 * @param scale - The maximum of an integer array.
 * @returns Peaks, or null when there are none.
 */
export declare function decodePeaks(value: string | number[] | null | undefined, scale?: number): number[] | null;
/**
 * Normalise a musical key to a short canonical form: root, accidental
 * (`#` or `b`), and `m` for minor. "F minor", "Fmin", "f m" → "Fm";
 * "C# Major", "C♯" → "C#". Anything unparseable comes back trimmed, as
 * given, so an unusual label still displays.
 *
 * @param key
 * @returns Canonical key, or '' for none.
 */
export declare function normalizeKey(key: string | null | undefined): string;
/**
 * Format seconds as m:ss (whole seconds, rounded down like a player's
 * clock), or as tenths under a second.
 *
 * A one-shot (a kick, a hat) is often shorter than a second, and m:ss would
 * round it to "0:00", which reads as a missing length.
 *
 * @param seconds
 * @returns e.g. "0:08", "0.4s", or '' when unknown.
 */
export declare function formatDuration(seconds: number | null | undefined): string;
/**
 * A playback position as a clock: whole seconds, rounded down like a
 * player's ("0:12", "1:05:09" past an hour).
 *
 * @param seconds
 * @returns e.g. "0:12"; "0:00" for anything unusable.
 */
export declare function formatClock(seconds: number): string;
/**
 * Parse a duration given as seconds (8.02) or as "m:ss" / "h:mm:ss".
 * @param value
 */
export declare function parseDuration(value: number | string | null | undefined): number | null;
/**
 * The title a file name implies: extension and separators dropped,
 * leading pack prefixes kept (they are often the label's code).
 * "NW_Bass_Loop_04_128_Fmin.wav" → "NW Bass Loop 04 128 Fmin".
 * @param url
 */
export declare function titleFromUrl(url: string): string;
/**
 * Normalise one sound into the shape the runtime and renderer use.
 *
 * @param input - A sound: `{url, title?, type?, bpm?, key?,
 *   duration?, tags?, peaks?, waveform?, download?, loop?, id?}`.
 * @param index - Its position (used for a fallback id).
 * @param peakScale - Scale of an integer `peaks` array.
 * @returns The sound, or null if it has
 *   no url.
 */
export declare function normalizeSound(input: Record<string, any>, index: number, peakScale?: number): Sound | null;
/**
 * The values of the loops-or-one-shots filter. A sound is a loop only when
 * it says so (`loop: true`); everything else is a one-shot.
 */
export declare const LOOP_FILTERS: string[];
/**
 * Is this a loop? Only an explicit yes counts: `true`, or `"true"` / `"1"`
 * as an attribute or a CSV-ish manifest writes it. Unset is a one-shot.
 *
 * @param value
 */
export declare function isLoop(value: unknown): boolean;
/**
 * Read a sounds manifest. Accepts `{version, peakScale?, sounds: [...]}`
 * (what `waveform-gen --manifest` writes) or a bare array of sounds.
 * Sounds without a url are dropped.
 *
 * @param manifest
 */
export declare function parseManifest(manifest: SoundsManifest | SoundInput[]): Sound[];
/**
 * Normalise a list of sounds, dropping invalid ones and de-duplicating ids
 * (a repeated id would make two rows answer to one play() call).
 * @param list
 * @param peakScale
 */
export declare function normalizeSounds(list: SoundInput[], peakScale?: number): Sound[];
/** Options of the pure filter helpers ({@link facets}, {@link matches}). */
export interface KeyOptions {
    /** Enharmonic keys (A#m and Bbm) are one key. Default true. Since 2.2.0. */
    mergeEnharmonicKeys?: boolean;
}
/**
 * What the filter controls offer, derived from the sounds: each type with
 * its count (in first-seen order), each key (in musical order; enharmonic
 * spellings merged into one entry unless `mergeEnharmonicKeys` is false —
 * see `keyEntries` for the spelling it shows), the BPM range, and how many
 * are loops and one-shots. A control with nothing to offer is not rendered.
 *
 * @param sounds
 * @param options
 * @returns `keyAliases`: each merged key entry's other spellings in the
 *   list (since 2.2.0).
 */
export declare function facets(sounds: Sound[], options?: KeyOptions): {
    types: {
        name: string;
        count: number;
    }[];
    keys: string[];
    keyAliases: Record<string, string[]>;
    bpm: {
        min: number;
        max: number;
    } | null;
    hasDuration: boolean;
    loops: number;
    oneShots: number;
};
/**
 * Does a sound match the filter? Every set criterion must hold. `loop` is
 * `'loop'` (loops only), `'one-shot'` (everything else) or empty (both).
 *
 * `query` matches the title, type, key and tags with
 * `@arraypress/text`'s `matchesAll`: every word, in any order, forgiving
 * one typo in words of four letters or more ("drun" finds drum loops). A
 * number in the query also matches the BPM exactly, so "bass 128" finds
 * 128 BPM bass loops.
 *
 * Keys: unless `mergeEnharmonicKeys` is false, a key filter matches every
 * spelling of that key (A#m finds Bbm too), and a key typed in the search
 * finds its other spellings.
 *
 * @param sound
 * @param filter
 * @param options
 */
export declare function matches(sound: Sound, filter?: Partial<SoundsFilter>, options?: KeyOptions): boolean;
/** The sort orders the toolbar offers. */
export declare const SORTS: SoundsSort[];
/**
 * The configured sort orders the data can use (no BPM sort without BPMs),
 * in the configured order. Shared by the renderer and the runtime, so the
 * menu and the starting order always agree.
 *
 * @param sorts - The configured orders.
 * @param f - The sounds' facets.
 */
export declare function availableSorts(sorts: string[], f: ReturnType<typeof facets>): string[];
/**
 * Sort sounds (returns a new array; `default` keeps the given order).
 * Missing values sort last in every order.
 *
 * @param sounds
 * @param by
 */
export declare function sortSounds(sounds: Sound[], by?: SoundsSort): Sound[];
//# sourceMappingURL=sounds.d.ts.map