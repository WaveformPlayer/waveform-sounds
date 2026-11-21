/**
 * The rows in the DOM: reading server-rendered rows back into sounds, and
 * finding a row by the sound it shows.
 *
 * @module rows
 */
import type { Sound } from '../types.js';
/**
 * Read server-rendered rows back into sounds. Rows are taken in their
 * original order (`data-ws-index`) and renumbered 0..n-1, and a row whose
 * data is unusable (no url) is removed — so a row missing from the markup
 * can't leave a hole that would misalign rows and sounds.
 *
 * @param list - The `[data-ws-list]` element.
 */
export declare function readRows(list: HTMLElement): Sound[];
/**
 * The row elements, indexed by the sound each one shows (whatever order
 * they're displayed in).
 *
 * @param list
 */
export declare function indexRows(list: HTMLElement): HTMLElement[];
/**
 * The rows currently visible (not hidden by the filter or the page), in
 * display order.
 *
 * @param list
 */
export declare function visibleRows(list: HTMLElement): HTMLElement[];
/**
 * Put the rows in the given order. Every row moves (hidden ones too), so
 * clearing a filter keeps the order.
 *
 * @param list
 * @param rows - In the order to show them.
 */
export declare function orderRows(list: HTMLElement, rows: HTMLElement[]): void;
//# sourceMappingURL=rows.d.ts.map