/**
 * The rows in the DOM: reading server-rendered sounds back, finding a row
 * by the sound it shows, and putting exactly the rows shown in the list.
 *
 * @module rows
 */

import {normalizeSound, normalizeSounds} from '../data/sounds.js';
import {LOG} from '../shared/utils.js';
import type {Sound} from '../types.js';

/** A list's row elements, in DOM order. */
const ROW = ':scope > [data-ws-index]';

/**
 * Read the sounds of server-rendered markup from its JSON
 * (`<script type="application/json" data-ws-sounds>`, since 2.2.0).
 *
 * @param root - The list's container.
 * @returns The sounds, or null when there is no (usable) JSON — then the
 *   rows themselves are read ({@link readRows}, markup from before 2.2).
 */
export function readSoundsData(root: HTMLElement): Sound[] | null {
    const script = root.querySelector(':scope > script[data-ws-sounds]');
    if (!script) return null;
    try {
        const list = JSON.parse(script.textContent || '');
        if (Array.isArray(list)) return normalizeSounds(list);
    } catch { /* reported below */ }
    console.warn(`${LOG} Ignoring unreadable sounds JSON (data-ws-sounds)`);
    return null;
}

/**
 * Read server-rendered rows back into sounds (markup from before 2.2.0,
 * whose rows carry every field as a `data-*` attribute). Rows are taken in their
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
 * The rows in the list (not hidden), in display order.
 *
 * @param list
 */
export function visibleRows(list: HTMLElement): HTMLElement[] {
    return [...list.querySelectorAll<HTMLElement>(ROW)].filter((r) => !r.hidden);
}

/**
 * Make the list hold exactly `rows`, in that order: rows not among them
 * leave the DOM, new ones go in, and rows already in order are not moved
 * (moving an element drops its focus, so a filter change keeps focus
 * where it was; only a re-sort moves rows).
 *
 * @param list
 * @param rows - In the order to show them.
 */
export function layoutRows(list: HTMLElement, rows: HTMLElement[]): void {
    const keep = new Set(rows);
    for (const el of [...list.children]) if (!keep.has(el as HTMLElement)) el.remove();
    let cursor = list.firstElementChild;
    for (const row of rows) {
        if (row === cursor) cursor = cursor.nextElementSibling;
        else list.insertBefore(row, cursor);
    }
}
