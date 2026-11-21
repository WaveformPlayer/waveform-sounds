/**
 * Colours the CSS can't hand the runtime directly: the canvas needs real
 * colour values (it can't read `var()` or `color-mix()`), and the inverted
 * "on" states need the page surface behind the list.
 *
 * @module colors
 */
/**
 * The alpha of a computed colour string: `rgba(0, 0, 0, 0)`,
 * `rgb(1 2 3 / 50%)`, `oklab(… / 0.9)`, `transparent`. Opaque when no alpha
 * is written.
 *
 * @param color
 * @returns 0..1.
 */
export declare function parseAlpha(color: string | null | undefined): number;
/**
 * The first (near-)opaque background at or above an element — the page
 * surface the list sits on. Crosses shadow-root boundaries.
 *
 * @param el
 * @param minAlpha - How opaque counts as "the surface".
 * @returns A computed colour, or `#fff` when nothing is painted.
 */
export declare function pageSurface(el: Element, minAlpha?: number): string;
/**
 * Is the page in forced colours (Windows High Contrast)? Then the canvas
 * must draw in system colours too.
 */
export declare function forcedColors(): boolean;
/**
 * Every element above `el`, nearest first, crossing shadow-root boundaries
 * (the elements whose class, style or theme attribute can change what the
 * list inherits).
 *
 * @param el
 */
export declare function ancestorsOf(el: Element): Element[];
/**
 * Resolve any CSS colour (a `var()`, `color-mix()`, `currentColor`) to a
 * concrete value, as it would compute inside `container`.
 *
 * @param container
 * @param value - A CSS colour expression.
 * @returns The computed colour.
 */
export declare function resolveCssColor(container: Element, value: string): string;
//# sourceMappingURL=colors.d.ts.map