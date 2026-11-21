/**
 * The list's icons: 24×24 single-path SVGs that take `currentColor`, so
 * they follow whatever colour their control has (and the system colours
 * under forced colours). Decorative (aria-hidden); every control carries
 * its own label.
 *
 * Each icon is defined ONCE per list, as a `<symbol>` in a hidden sprite
 * ({@link iconSprite}), and every use is a `<use>` of it ({@link icon}):
 * a row's play and pause icons were ~240 bytes of inline paths, on every
 * row. The symbol ids carry the list's id prefix, so two lists on a page
 * never share (or break) each other's icons. Since 2.2.0.
 *
 * @module icons
 */

import {escapeHtml} from '@arraypress/text';

/** Every icon's path data. */
export const ICON_PATHS = {
    play: 'M8 5.5v13l11-6.5z',
    pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
    search: 'M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z',
    chevron: 'M6.4 8.6 12 14.2l5.6-5.6L19 10l-7 7-7-7z',
    check: 'M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6 11-11-1.4-1.4z',
    download: 'M11 4h2v8.6l3.3-3.3 1.4 1.4L12 16.4l-5.7-5.7 1.4-1.4 3.3 3.3zM5 18h14v2H5z',
    loop: 'M17 4l3 3-3 3V8H8a3 3 0 0 0-3 3v1H3v-1a5 5 0 0 1 5-5h9V4zM7 20l-3-3 3-3v2h9a3 3 0 0 0 3-3v-1h2v1a5 5 0 0 1-5 5H7v2z',
};

/** An icon's name. */
export type IconName = keyof typeof ICON_PATHS;

/** Every icon, in sprite order. */
export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];

/**
 * A symbol's id: the list's id prefix + the icon (`ws1x9k2f-i-play`).
 *
 * @param id - The list's id prefix.
 * @param name
 */
export function iconId(id: string, name: IconName): string {
    return `${id}-i-${name}`;
}

/**
 * The sprite: one hidden `<svg>` holding a `<symbol>` for each icon the
 * list uses. Zero-sized by its attributes (no CSS needed, no style
 * attribute for a CSP to block), not `display: none` (some engines drop
 * what a hidden SVG defines). `data-ws-sprite` names the id prefix, so the
 * runtime renders new rows against the same symbols.
 *
 * @param id - The list's id prefix.
 * @param names - The icons to define.
 */
export function iconSprite(id: string, names: IconName[]): string {
    const symbols = ICON_NAMES.filter((n) => names.includes(n))
        .map((n) => `<symbol id="${escapeHtml(iconId(id, n))}" viewBox="0 0 24 24"><path d="${ICON_PATHS[n]}"/></symbol>`).join('');
    return `<svg class="ws-sprite" data-ws-sprite="${escapeHtml(id)}" width="0" height="0" aria-hidden="true" focusable="false">${symbols}</svg>`;
}

/**
 * One icon: a `<use>` of its symbol in the list's sprite.
 *
 * @param id - The list's id prefix.
 * @param name
 * @param extraClass - Classes beyond `ws-icon`.
 */
export function icon(id: string, name: IconName, extraClass: string = ''): string {
    const cls = extraClass ? `ws-icon ${extraClass}` : 'ws-icon';
    return `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#${escapeHtml(iconId(id, name))}"/></svg>`;
}
