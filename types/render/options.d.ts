/**
 * The options that shape the markup — the renderer's whole input — with
 * their defaults and validation. DOM-free: the server renderer uses it,
 * and the runtime's option surface (`core/options.js`) builds on it.
 *
 * @module render/options
 */
import type { SoundsColumn, SoundsFilterControl, WaveformSoundsOptions, WaveformSoundsStrings } from '../types.js';
/** The filter controls a list can offer. */
export declare const FILTERS: SoundsFilterControl[];
/** The columns a row can show after its title. */
export declare const COLUMNS: SoundsColumn[];
/** The options that shape the markup (the renderer's whole input). */
export declare const RENDER_DEFAULTS: Required<Pick<WaveformSoundsOptions, 'player' | 'search' | 'filters' | 'sorts' | 'loopToggle' | 'showCount' | 'menuSearch' | 'pageSize' | 'columns' | 'maxTypeChips'>>;
/** {@link resolveRenderOptions}' result: the render options, complete, plus
 *  whatever else the caller passed. */
export type RenderOptions = typeof RENDER_DEFAULTS & {
    strings: WaveformSoundsStrings;
    idPrefix?: string;
    loop?: boolean | null;
};
/**
 * Every option that shapes the server markup: the render defaults, plus
 * `idPrefix` (the dropdowns' ids), `loop` (whether the Loop toggle starts
 * pressed) and `strings`. A wrapper that renders on the server passes
 * exactly these to `renderSounds` — and the same values to the runtime, or
 * the browser re-lays out what the server drew. Since 2.1.0.
 */
export declare const RENDER_OPTION_KEYS: (keyof WaveformSoundsOptions)[];
/**
 * The render options set in `options` (those in {@link RENDER_OPTION_KEYS}
 * that aren't null or undefined), for handing a component's options to
 * `renderSounds` on the server. Since 2.1.0.
 *
 * @param options - Any `WaveformSoundsOptions` (or a component's props).
 * @returns Just the render options that are set.
 */
export declare function pickRenderOptions(options: WaveformSoundsOptions | null | undefined): WaveformSoundsOptions;
/**
 * The object without its `undefined` entries (so spreading it can't erase
 * a default).
 *
 * @param obj
 */
export declare function defined(obj: Record<string, any> | null | undefined): Record<string, any>;
/**
 * The entries of `values` that are allowed, in the caller's order; the
 * fallback when `values` isn't a list.
 *
 * @param values
 * @param allowed
 * @param fallback
 */
export declare function allowedList<T extends string>(values: unknown, allowed: T[], fallback: T[]): T[];
/**
 * A whole number ≥ 0, or the fallback.
 *
 * @param value
 * @param fallback
 */
export declare function wholeNumber(value: unknown, fallback: number): number;
/**
 * The render options, defaulted and validated: unknown filters, sorts and
 * columns are dropped, counts are whole numbers, `strings` is complete.
 *
 * @param options
 */
export declare function resolveRenderOptions(options?: WaveformSoundsOptions): RenderOptions;
//# sourceMappingURL=options.d.ts.map