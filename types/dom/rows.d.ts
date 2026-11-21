/**
 * The rows in the DOM: reading server-rendered sounds back, finding a row
 * by the sound it shows, and putting exactly the rows shown in the list.
 *
 * @module rows
 */
import type { Sound } from '../types.js';
/**
 * Read the sounds of server-rendered markup from its JSON
 * (`<script type="application/json" data-ws-sounds>`, since 2.2.0).
 *
 * @param root - The list's container.
 * @returns The sounds, or null when there is no (usable) JSON — then the
 *   rows themselves are read ({@link readRows}, markup from before 2.2).
 */
export declare function readSoundsData(root: HTMLElement): Sound[] | null;
/**
 * Read server-rendered rows back into sounds (markup from before 2.2.0,
 * whose rows carry every field as a `data-*` attribute). Rows are taken in their
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
 * The rows in the list (not hidden), in display order.
 *
 * @param list
 */
export declare function visibleRows(list: HTMLElement): HTMLElement[];
/**
 * Make the list hold exactly `rows`, in that order: rows not among them
 * leave the DOM, new ones go in, and rows already in order are not moved
 * (moving an element drops its focus, so a filter change keeps focus
 * where it was; only a re-sort moves rows).
 *
 * @param list
 * @param rows - In the order to show them.
 */
export declare function layoutRows(list: HTMLElement, rows: HTMLElement[]): void;
//# sourceMappingURL=rows.d.ts.map