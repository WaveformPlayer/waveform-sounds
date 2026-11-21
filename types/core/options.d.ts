/**
 * The runtime's option surface: every option with its default, the
 * `data-*` form a container (or a server-rendering wrapper) uses, and the
 * merge that resolves them. The options that shape the markup are defined
 * with the renderer (`render/options.ts`) and included here. `types.ts`
 * documents each option; the wrappers' drift guards compare their
 * forwarding against `WaveformSoundsOptions` (in the generated
 * `types/types.d.ts`).
 *
 * Precedence, as across the waveform family: data-* > constructor > default.
 *
 * @module options
 */
import { RENDER_DEFAULTS } from '../render/options.js';
import type { WaveformSoundsOptions } from '../types.js';
export { RENDER_DEFAULTS };
/** Every option, with its default. */
export declare const DEFAULT_OPTIONS: WaveformSoundsOptions;
/**
 * A boolean attribute: present-and-empty or "true" → true, "false" → false.
 *
 * @param value
 * @returns undefined for anything else (not set).
 */
export declare function parseBool(value: string | undefined): boolean | undefined;
/**
 * A comma list attribute ("type, key" → ['type', 'key']). An empty string
 * is an empty list (e.g. `data-sorts=""` = no sort menu).
 *
 * @param value
 */
export declare function parseList(value: string | undefined): string[] | undefined;
/**
 * A number attribute; an empty string is "not set".
 *
 * @param value
 */
export declare function parseNumber(value: string | undefined): number | undefined;
/**
 * `data-url-state`: "true"/empty → true, "false" → false, anything else is
 * the parameter prefix.
 *
 * @param value
 */
export declare function parseUrlState(value: string | undefined): boolean | string | undefined;
/**
 * A JSON attribute (`data-strings`, `data-player-options`). Invalid JSON is
 * reported and ignored, never thrown: a typo in markup must not take the
 * whole list down.
 *
 * @param value
 * @param name - The attribute name, for the warning.
 */
export declare function parseJson(value: string | undefined, name: string): Record<string, any> | undefined;
/**
 * The options set on a container as `data-*` attributes (kebab-case:
 * `data-page-size` → `pageSize`). Attributes that are absent (or unusable)
 * are left out, so they never override a constructor option.
 *
 * @param el
 * @returns The options found.
 */
export declare function readDataOptions(el: HTMLElement): Record<string, any>;
/**
 * Merge option sources: later ones win, and null/undefined never
 * overwrite (an unset prop must not erase a default).
 *
 * @param sources
 */
export declare function mergeOptions(...sources: (Record<string, any> | null | undefined)[]): Record<string, any>;
//# sourceMappingURL=options.d.ts.map