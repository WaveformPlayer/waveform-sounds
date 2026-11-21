/**
 * Filters in the address (`urlState`): which query parameters hold them,
 * reading them into a filter, and writing a filter back into a URL. Pure:
 * the runtime passes `location.search` / `location.href` in and calls
 * `history.replaceState` with what comes out.
 *
 *   ?q=bass&type=Bass+loops&key=Fm&bpm=120-130&loop=one-shot&sort=bpm
 *
 * @module url-state
 */
import type { SoundsFilter } from '../types.js';
/**
 * The parameter names, or null when urlState is off. A string urlState
 * prefixes them (`'pack'` → `pack-q`, `pack-type`, …) so two lists on one
 * page don't share a filter.
 *
 * @param urlState
 */
export declare function urlKeys(urlState: boolean | string | null | undefined): {
    q: string;
    type: string;
    key: string;
    bpm: string;
    loop: string;
    sort: string;
} | null;
/**
 * A BPM range parameter: "120-130", "120-", "-130", or with decimals
 * ("128.5-130", what `setFilter({bpmMin: 128.5})` writes). Reversed ends
 * are put in order.
 *
 * @param value
 * @returns null if malformed.
 */
export declare function parseBpmRange(value: string | null | undefined): {
    bpmMin: string;
    bpmMax: string;
} | null;
/**
 * Keep only the limits that fall inside the pack's BPM range: a link made
 * for another pack (`?bpm=200-` on one topping out at 174) must not empty
 * the list, and a limit beyond an end is no limit at all.
 *
 * @param range - From {@link parseBpmRange}.
 * @param extent - The slider's range; null when the pack has no BPMs
 *   (then any BPM filter would hide everything, so none is kept).
 * @returns The usable limits, or null when none is left.
 */
export declare function bpmRangeWithin(range: {
    bpmMin: string;
    bpmMax: string;
}, extent: {
    min: number;
    max: number;
} | null): {
    bpmMin: string;
    bpmMax: string;
} | null;
/**
 * The inverse of {@link parseBpmRange}; '' when neither end is set.
 *
 * @param min
 * @param max
 */
export declare function formatBpmRange(min: string | number | null | undefined, max: string | number | null | undefined): string;
/**
 * Read the filter and sort from a query string. Values the list can't use
 * (a type it doesn't have, a key no sound is in, a BPM limit outside its
 * range, a loops filter on a list that isn't a mix of loops and one-shots,
 * a sort it doesn't offer)
 * are ignored, never applied: a stale link shows the whole list, not an
 * empty one.
 *
 * @param search - `location.search`.
 * @param keys
 * @param available - From `facets()`, with `bpm` as the slider's range
 *   (`bpmExtent()`).
 * @param sorts - The sort orders offered.
 * @returns A filter patch, and the sort (or null).
 */
export declare function readUrlState(search: string, keys: ReturnType<typeof urlKeys>, available: {
    types: {
        name: string;
    }[];
    keys: string[];
    loops?: number;
    oneShots?: number;
    bpm?: {
        min: number;
        max: number;
    } | null;
}, sorts: string[]): {
    filter: Partial<SoundsFilter>;
    sort: string | null;
};
/**
 * The URL with the filter written in. Empty values (and the starting sort)
 * are removed rather than written empty; every other parameter and the
 * hash are kept.
 *
 * @param href - `location.href`.
 * @param keys
 * @param filter
 * @param sort
 * @param defaultSort - The starting order (not written).
 * @returns The new href (equal to `href` when nothing changed).
 */
export declare function writeUrlState(href: string, keys: ReturnType<typeof urlKeys>, filter: SoundsFilter, sort: string, defaultSort: string): string;
//# sourceMappingURL=url-state.d.ts.map