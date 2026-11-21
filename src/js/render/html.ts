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

import {escapeHtml} from '@arraypress/text';

/** An element's attributes: `true` writes a bare one, `false`/null/undefined leave it out. */
export type HtmlAttrs = Record<string, string | number | boolean | null | undefined>;

/** A child: an HTML string, a falsy one (skipped), or a nested list. */
export type HtmlChild = string | false | null | undefined | HtmlChild[];

/** Elements with no closing tag. */
const VOID = new Set(['input', 'br', 'img']);

/**
 * Escape text for use as a child.
 *
 * @param value
 */
export function text(value: unknown): string {
    return escapeHtml(value ?? '');
}

/**
 * Serialise attributes, in the order given.
 *
 * @param map
 * @returns e.g. ` class="ws-row" hidden` (leading space included).
 */
export function attrs(map: HtmlAttrs = {}): string {
    let out = '';
    for (const [name, value] of Object.entries(map)) {
        if (value === true) out += ` ${name}`;
        else if (value !== false && value != null) out += ` ${name}="${escapeHtml(value)}"`;
    }
    return out;
}

/**
 * Build an element.
 *
 * @param tag
 * @param attributes
 * @param children - HTML strings; falsy ones and nested arrays are flattened away.
 */
export function h(tag: string, attributes: HtmlAttrs = {}, ...children: HtmlChild[]): string {
    const open = `<${tag}${attrs(attributes)}>`;
    if (VOID.has(tag)) return open;
    return open + (children as any[]).flat(Infinity).filter((c) => c != null && c !== false && c !== '').join('') + `</${tag}>`;
}
