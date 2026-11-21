/**
 * Moving through the list: which row a key lands on, how far an arrow
 * seeks, and which rows the current page shows. Pure — the runtime maps
 * the results onto rows and the engine.
 *
 * @module navigation
 */

import {clamp} from '../shared/utils.js';

/** How far ←/→ seek, as a fraction of the sound. */
export const SEEK_STEP = 0.1;

/**
 * Where a navigation key moves from position `at` in a list of `count`
 * visible rows.
 *
 * @param key - `KeyboardEvent.key`.
 * @param at - The focused row's position among the visible rows.
 * @param count - How many rows are visible.
 * @returns The new position; `'search'` for ↑ on
 *   the first row (back to the search field); null when the key isn't a
 *   move or there is nowhere to go.
 */
export function rowTarget(key: string, at: number, count: number): number | 'search' | null {
    if (!count) return null;
    switch (key) {
        case 'ArrowDown': return at + 1 < count ? at + 1 : null;
        case 'ArrowUp': return at > 0 ? at - 1 : 'search';
        case 'Home': return 0;
        case 'End': return count - 1;
        default: return null;
    }
}

/**
 * The position an ←/→ press seeks to. Stops just short of the end, so a
 * held → can't end the sound by accident.
 *
 * @param progress - Current position, 0..1.
 * @param key - `'ArrowRight'` or `'ArrowLeft'`.
 * @returns The new position, or null for any other key.
 */
export function seekTarget(progress: number, key: string): number | null {
    if (key !== 'ArrowRight' && key !== 'ArrowLeft') return null;
    return clamp(progress + (key === 'ArrowRight' ? SEEK_STEP : -SEEK_STEP), 0, 0.999);
}

/**
 * Which of the matching sounds the current page shows, and how many more
 * "Show more" would reveal.
 *
 * @template T
 * @param shown - The sounds that match, in display order.
 * @param limit - How many to show (Infinity for all).
 * @returns 
 */
export function pageWindow<T>(shown: T[], limit: number): {visible: Set<T>, remaining: number} {
    const visible = new Set(shown.slice(0, limit));
    return {visible, remaining: shown.length - visible.size};
}

/**
 * The page limit that reveals position `pos` (used when playing past the
 * end of the current page, e.g. by `next()` or auto-advance).
 *
 * @param limit - The current limit.
 * @param pos - The position that must be visible.
 * @returns 
 */
export function limitToReveal(limit: number, pos: number): number {
    return pos >= limit ? pos + 1 : limit;
}
