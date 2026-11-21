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
/** Every icon's path data. */
export declare const ICON_PATHS: {
    play: string;
    pause: string;
    search: string;
    chevron: string;
    check: string;
    download: string;
    loop: string;
};
/** An icon's name. */
export type IconName = keyof typeof ICON_PATHS;
/** Every icon, in sprite order. */
export declare const ICON_NAMES: IconName[];
/**
 * A symbol's id: the list's id prefix + the icon (`ws1x9k2f-i-play`).
 *
 * @param id - The list's id prefix.
 * @param name
 */
export declare function iconId(id: string, name: IconName): string;
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
export declare function iconSprite(id: string, names: IconName[]): string;
/**
 * One icon: a `<use>` of its symbol in the list's sprite.
 *
 * @param id - The list's id prefix.
 * @param name
 * @param extraClass - Classes beyond `ws-icon`.
 */
export declare function icon(id: string, name: IconName, extraClass?: string): string;
//# sourceMappingURL=icons.d.ts.map