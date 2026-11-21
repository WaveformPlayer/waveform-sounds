/**
 * Server-safe renderer: the component's markup as an HTML string, from the
 * same data helpers the browser uses. No DOM, no window.
 *
 * A wrapper that renders on the server (Astro, SSR React/Vue/Svelte) calls
 * {@link renderSounds} and emits the result inside a
 * `[data-waveform-sounds]` element; the browser runtime then ADOPTS that
 * markup instead of building its own, so the list is there (and readable,
 * and crawlable) before any script runs.
 *
 * The markup is the contract between the two halves: every class and
 * `data-ws-*` attribute here is read by the runtime (`core.js`,
 * `menus.js`, `rows.js`).
 *
 * @module render
 */
import { escapeHtml } from '../vendor/arraypress-text.js';
import { availableSorts, facets } from '../data/sounds.js';
import { pickRenderOptions, RENDER_DEFAULTS, RENDER_OPTION_KEYS, resolveRenderOptions } from './options.js';
import { countText, DEFAULT_STRINGS, fill } from './strings.js';
import type { Sound, SoundInput, WaveformSoundsOptions } from '../types.js';
export { escapeHtml, RENDER_DEFAULTS, RENDER_OPTION_KEYS, pickRenderOptions, resolveRenderOptions, DEFAULT_STRINGS, countText, fill, availableSorts };
/**
 * A stable id prefix for a list's dropdowns, from its sounds: the same on
 * the server and in the browser. Two lists of the SAME sounds on one page
 * collide, so they need an `idPrefix` each.
 *
 * @param sounds
 * @returns e.g. `ws1x9k2f`.
 */
export declare function idBase(sounds: {
    url: string;
}[]): string;
/**
 * Which controls the toolbar shows. Each appears only when it's enabled
 * AND the data gives it something to do: no type filter for one type, no
 * key menu for one key, no BPM range without a spread of BPMs, no loops
 * filter unless the list has both loops and one-shots, no sort menu with
 * one usable order. Types past `maxTypeChips` become a menu (a
 * pack has a handful; a whole library can have fifty).
 *
 * @param f - The sounds' facets.
 * @param o - Resolved options.
 */
export declare function toolbarPlan(f: ReturnType<typeof facets>, o: ReturnType<typeof resolveRenderOptions>): {
    types: 'chips' | 'menu' | null;
    key: boolean;
    bpm: boolean;
    loops: boolean;
    sorts: string[];
    search: boolean;
    loop: boolean;
    count: boolean;
};
/**
 * Does the Loop toggle start on? An explicit `loop` option decides; left
 * unset, it's on exactly when the list marks loops (only those repeat, so
 * a one-shot still plays once).
 *
 * @param loop - The `loop` option.
 * @param f - The sounds' facets.
 */
export declare function loopsByDefault(loop: boolean | null | undefined, f: {
    loops: number;
}): boolean;
/** A dropdown's content ({@link renderMenu}). */
export interface MenuSpec {
    id: string;
    label: string;
    prefix?: string;
    value: string;
    /** `alt`: other names the menu's search finds the option by (a merged
     *  key's other spellings). */
    options: {
        value: string;
        label: string;
        count?: number;
        alt?: string;
    }[];
    searchFrom: number;
    placeholder?: string;
    noMatches: string;
}
/**
 * A dropdown: a button and a popup listbox, with a search field when it
 * has more than `searchFrom` options. The runtime (`menus.js`) opens,
 * filters and navigates it; without JS the button still shows the value.
 *
 * @param name - 'type' | 'key' | 'sort' (the runtime routes by it).
 * @param m
 * @param m.id - Id prefix for this list.
 * @param m.label - Accessible name ("Type").
 * @param [m.prefix] - Visible lead-in ("Sort by"); otherwise the label is screen-reader only.
 * @param m.value - The selected value.
 * @param m.options
 * @param m.searchFrom - Options above which a search field is added.
 * @param [m.placeholder] - The search field's placeholder (no field without one).
 * @param m.noMatches - Shown when the search matches nothing.
 */
export declare function renderMenu(name: string, m: MenuSpec): string;
/**
 * One row. `index` is the sound's position in the ORIGINAL list: the
 * runtime maps rows back to sounds through it, whatever order they are
 * sorted into. Every field is also written as a `data-*` attribute, so the
 * runtime can rebuild the sounds from server markup.
 *
 * @param sound - Normalised.
 * @param index
 * @param o
 * @param hidden - Past the first page.
 */
export declare function renderRow(sound: Sound, index: number, o: ReturnType<typeof resolveRenderOptions>, hidden?: boolean): string;
/**
 * The whole component's inner markup.
 *
 * @param sounds - Sounds (normalised or raw; normalised here).
 * @param options - Render options (see `WaveformSoundsOptions`).
 * @returns HTML for the inside of `[data-waveform-sounds]`.
 */
export declare function renderSounds(sounds: SoundInput[], options?: WaveformSoundsOptions): string;
/**
 * The `data-*` attributes that carry the render options set in `options` to
 * the runtime (`data-page-size="20"`, `data-filters=""`, `data-strings='{…}'`),
 * in the form `readDataOptions` reads — so the browser keeps what the server
 * drew instead of falling back to the defaults (re-paging 20 rows to 50).
 * Only options that are set are written; `player` is always written by
 * {@link renderSoundsElement}. Since 2.1.0.
 *
 * @param options
 * @returns Attributes, in {@link RENDER_OPTION_KEYS} order.
 */
export declare function renderOptionAttributes(options?: WaveformSoundsOptions): Record<string, string>;
/**
 * The full element, for callers who want one string: the wrapper div with
 * its `data-waveform-sounds` marker, its `data-player`, a `data-*` attribute
 * for every other render option set (see {@link renderOptionAttributes}) and
 * the inner markup. The inner markup is exactly {@link renderSounds}'.
 *
 * @param sounds
 * @param options
 * @param className - Extra classes for the wrapper.
 */
export declare function renderSoundsElement(sounds: SoundInput[], options?: WaveformSoundsOptions, className?: string): string;
//# sourceMappingURL=markup.d.ts.map