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

import {LOOP_FILTERS, normalizeKey} from './sounds.js';
import type {SoundsFilter, SoundsLoopFilter} from '../types.js';

/**
 * The parameter names, or null when urlState is off. A string urlState
 * prefixes them (`'pack'` → `pack-q`, `pack-type`, …) so two lists on one
 * page don't share a filter.
 *
 * @param urlState
 * @returns 
 */
export function urlKeys(urlState: boolean | string | null | undefined): {q: string, type: string, key: string, bpm: string, loop: string, sort: string} | null {
    if (!urlState) return null;
    const p = typeof urlState === 'string' ? `${urlState}-` : '';
    return {q: `${p}q`, type: `${p}type`, key: `${p}key`, bpm: `${p}bpm`, loop: `${p}loop`, sort: `${p}sort`};
}

/**
 * A BPM range parameter: "120-130", "120-" or "-130".
 *
 * @param value
 * @returns null if malformed.
 */
export function parseBpmRange(value: string | null | undefined): {bpmMin: string, bpmMax: string} | null {
    const m = String(value ?? '').match(/^(\d*)-(\d*)$/);
    return m && (m[1] || m[2]) ? {bpmMin: m[1], bpmMax: m[2]} : null;
}

/**
 * The inverse of {@link parseBpmRange}; '' when neither end is set.
 *
 * @param min
 * @param max
 * @returns 
 */
export function formatBpmRange(min: string | number | null | undefined, max: string | number | null | undefined): string {
    const lo = min ?? '', hi = max ?? '';
    return lo !== '' || hi !== '' ? `${lo}-${hi}` : '';
}

/**
 * Read the filter and sort from a query string. Values the list can't use
 * (a type it doesn't have, a key no sound is in, a loops filter on a list
 * that isn't a mix of loops and one-shots, a sort it doesn't offer)
 * are ignored, never applied: a stale link shows the whole list, not an
 * empty one.
 *
 * @param search - `location.search`.
 * @param keys
 * @param available - From `facets()`.
 * @param sorts - The sort orders offered.
 * @returns A filter patch, and the sort (or null).
 */
export function readUrlState(search: string, keys: ReturnType<typeof urlKeys>, available: {types: {name: string}[], keys: string[], loops?: number, oneShots?: number}, sorts: string[]): {filter: Partial<SoundsFilter>, sort: string|null} {
    const out: {filter: Partial<SoundsFilter>, sort: string | null} = {filter: {}, sort: null};
    if (!keys) return out;
    const sp = new URLSearchParams(search);
    const q = sp.get(keys.q);
    if (q) out.filter.query = q;
    const type = sp.get(keys.type);
    if (type && available.types.some((t) => t.name === type)) out.filter.type = type;
    const key = normalizeKey(sp.get(keys.key));
    if (key && available.keys.includes(key)) out.filter.key = key;
    const bpm = parseBpmRange(sp.get(keys.bpm));
    if (bpm) Object.assign(out.filter, bpm);
    const loop = sp.get(keys.loop);
    if (LOOP_FILTERS.includes(loop!) && available.loops! > 0 && available.oneShots! > 0) out.filter.loop = loop as SoundsLoopFilter;
    const sort = sp.get(keys.sort);
    if (sort && sorts.includes(sort)) out.sort = sort;
    return out;
}

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
export function writeUrlState(href: string, keys: ReturnType<typeof urlKeys>, filter: {query: string, type: string, key: string, bpmMin: string, bpmMax: string, loop?: string}, sort: string, defaultSort: string): string {
    if (!keys) return href;
    const url = new URL(href);
    const set = (name: string, v: string | undefined) => (v ? url.searchParams.set(name, v) : url.searchParams.delete(name));
    set(keys.q, String(filter.query ?? '').trim());
    set(keys.type, filter.type);
    set(keys.key, filter.key);
    set(keys.bpm, formatBpmRange(filter.bpmMin, filter.bpmMax));
    set(keys.loop, filter.loop);
    set(keys.sort, sort !== defaultSort ? sort : '');
    return url.href;
}
