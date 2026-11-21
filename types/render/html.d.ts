/**
 * A tiny HTML string builder for the server-safe renderer. Two rules make
 * it safe to use everywhere:
 *
 *   - ATTRIBUTE values are always escaped. `true` writes a bare attribute
 *     (`hidden`, `download`); `false`, `null` and `undefined` leave it out.
 *     ARIA states are strings, so pass `String(bool)` for those.
 *   - CHILDREN are HTML. Text goes through {@link text} first.
 *
 * @module html
 */
/** An element's attributes: `true` writes a bare one, `false`/null/undefined leave it out. */
export type HtmlAttrs = Record<string, string | number | boolean | null | undefined>;
/** A child: an HTML string, a falsy one (skipped), or a nested list. */
export type HtmlChild = string | false | null | undefined | HtmlChild[];
/**
 * Escape text for use as a child.
 *
 * @param value
 * @returns
 */
export declare function text(value: unknown): string;
/**
 * Serialise attributes, in the order given.
 *
 * @param map
 * @returns e.g. ` class="ws-row" hidden` (leading space included).
 */
export declare function attrs(map?: HtmlAttrs): string;
/**
 * Build an element.
 *
 * @param tag
 * @param attributes
 * @param children - HTML strings; falsy ones and nested arrays are flattened away.
 * @returns
 */
export declare function h(tag: string, attributes?: HtmlAttrs, ...children: HtmlChild[]): string;
