/**
 * Moving through the list: which row a key lands on, how far an arrow
 * seeks, and which rows the current page shows. Pure — the runtime maps
 * the results onto rows and the engine.
 *
 * @module navigation
 */
/** How far ←/→ seek, as a fraction of the sound. */
export declare const SEEK_STEP = 0.1;
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
export declare function rowTarget(key: string, at: number, count: number): number | 'search' | null;
/**
 * The position an ←/→ press seeks to. Stops just short of the end, so a
 * held → can't end the sound by accident.
 *
 * @param progress - Current position, 0..1.
 * @param key - `'ArrowRight'` or `'ArrowLeft'`.
 * @returns The new position, or null for any other key.
 */
export declare function seekTarget(progress: number, key: string): number | null;
/** Where End seeks on a slider: just short of the end, so it can't end
 *  the sound (and with it auto-advance) by accident. */
export declare const SEEK_END = 0.999;
/**
 * The position Home / End seek to on a row's seek slider (the ARIA slider
 * pattern: they go to the minimum / maximum, not to the first / last row).
 *
 * @param key - `KeyboardEvent.key`.
 * @returns 0 for Home, {@link SEEK_END} for End, else null.
 */
export declare function sliderEdgeTarget(key: string): number | null;
/**
 * Rows are rendered as they are revealed, never all up front: a page's
 * worth, or with paging off this many at a time, more as the list
 * scrolls toward its end. Since 2.2.0.
 */
export declare const RENDER_CHUNK = 50;
/**
 * How many of the matching sounds have rows: the page, or with paging off
 * the rows rendered so far (`budget`). The server renders the first of
 * these ({@link firstRender}).
 *
 * @param matching - How many sounds match.
 * @param limit - The page limit (Infinity when paging is off).
 * @param budget - Rows rendered so far when paging is off.
 */
export declare function renderedCount(matching: number, limit: number, budget: number): number;
/**
 * How many rows a list starts with: a page, or with paging off
 * {@link RENDER_CHUNK}.
 *
 * @param pageSize - The `pageSize` option (0 = paging off).
 */
export declare function firstRender(pageSize: number): number;
/**
 * The budget that renders position `pos` with paging off: whole chunks.
 *
 * @param budget - Rows rendered so far.
 * @param pos - The position that must have a row.
 */
export declare function budgetToReveal(budget: number, pos: number): number;
/**
 * The page limit that reveals position `pos` (used when playing past the
 * end of the current page, e.g. by `next()` or auto-advance).
 *
 * @param limit - The current limit.
 * @param pos - The position that must be visible.
 */
export declare function limitToReveal(limit: number, pos: number): number;
//# sourceMappingURL=navigation.d.ts.map