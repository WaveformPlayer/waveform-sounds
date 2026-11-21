/**
 * The rows in the DOM: reading server-rendered rows back into sounds, and
 * finding a row by the sound it shows.
 *
 * @module rows
 */

import {normalizeSound} from '../data/sounds.js';
import type {Sound} from '../types.js';

/** A list's row elements, in DOM order. */
const ROW = ':scope > [data-ws-index]';

/**
 * Read server-rendered rows back into sounds. Rows are taken in their
 * original order (`data-ws-index`) and renumbered 0..n-1, and a row whose
 * data is unusable (no url) is removed — so a row missing from the markup
 * can't leave a hole that would misalign rows and sounds.
 *
 * @param list - The `[data-ws-list]` element.
 */
export function readRows(list: HTMLElement): Sound[] {
    const rows = [...list.querySelectorAll<HTMLElement>(ROW)]
        .sort((a, b) => Number(a.dataset.wsIndex) - Number(b.dataset.wsIndex));
    const sounds: Sound[] = [];
    for (const row of rows) {
        const d = row.dataset;
        const sound = normalizeSound({
            id: d.wsId, url: d.url, title: d.title, type: d.type, bpm: d.bpm, key: d.key,
            duration: d.duration, tags: d.tags, peaks: d.peaks, waveform: d.waveform, download: d.download, loop: d.loop,
        }, sounds.length);
        if (!sound) { row.remove(); continue; }
        row.dataset.wsIndex = String(sounds.length);
        sounds.push(sound);
    }
    return sounds;
}

/**
 * The row elements, indexed by the sound each one shows (whatever order
 * they're displayed in).
 *
 * @param list
 */
export function indexRows(list: HTMLElement): HTMLElement[] {
    const rows: HTMLElement[] = [];
    list.querySelectorAll<HTMLElement>(ROW).forEach((row) => { rows[Number(row.dataset.wsIndex)] = row; });
    return rows;
}

/**
 * The rows currently visible (not hidden by the filter or the page), in
 * display order.
 *
 * @param list
 */
export function visibleRows(list: HTMLElement): HTMLElement[] {
    return [...list.querySelectorAll<HTMLElement>(ROW)].filter((r) => !r.hidden);
}

/**
 * Put the rows in the given order. Every row moves (hidden ones too), so
 * clearing a filter keeps the order.
 *
 * @param list
 * @param rows - In the order to show them.
 */
export function orderRows(list: HTMLElement, rows: HTMLElement[]) {
    const frag = document.createDocumentFragment();
    for (const row of rows) if (row) frag.appendChild(row);
    list.appendChild(frag);
}
