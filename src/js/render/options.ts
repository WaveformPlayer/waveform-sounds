/**
 * The options that shape the markup — the renderer's whole input — with
 * their defaults and validation. DOM-free: the server renderer uses it,
 * and the runtime's option surface (`core/options.js`) builds on it.
 *
 * @module render/options
 */

import {SORTS} from '../data/sounds.js';
import {DEFAULT_STRINGS} from './strings.js';
import type {SoundsColumn, SoundsFilterControl, WaveformSoundsOptions, WaveformSoundsStrings} from '../types.js';

/** The filter controls a list can offer. */
export const FILTERS: SoundsFilterControl[] = ['type', 'key', 'bpm', 'loop'];

/** The columns a row can show after its title. */
export const COLUMNS: SoundsColumn[] = ['type', 'bpm', 'key', 'duration'];

/** The options that shape the markup (the renderer's whole input). */
export const RENDER_DEFAULTS: Required<Pick<WaveformSoundsOptions,
    'player' | 'search' | 'filters' | 'sorts' | 'loopToggle' | 'showCount' | 'menuSearch' | 'pageSize' | 'columns' | 'maxTypeChips'>> = {
    player: 'inline',
    search: true,
    filters: [...FILTERS],
    sorts: [...SORTS],
    loopToggle: true,
    showCount: true,
    menuSearch: 8,
    pageSize: 50,
    columns: [...COLUMNS],
    maxTypeChips: 10,
};

/** {@link resolveRenderOptions}' result: the render options, complete, plus
 *  whatever else the caller passed. */
export type RenderOptions = typeof RENDER_DEFAULTS & {strings: WaveformSoundsStrings, idPrefix?: string, loop?: boolean | null};

/**
 * Every option that shapes the server markup: the render defaults, plus
 * `idPrefix` (the dropdowns' ids), `loop` (whether the Loop toggle starts
 * pressed) and `strings`. A wrapper that renders on the server passes
 * exactly these to `renderSounds` — and the same values to the runtime, or
 * the browser re-lays out what the server drew. Since 2.1.0.
 */
export const RENDER_OPTION_KEYS = [...Object.keys(RENDER_DEFAULTS), 'idPrefix', 'loop', 'strings'] as (keyof WaveformSoundsOptions)[];

/**
 * The render options set in `options` (those in {@link RENDER_OPTION_KEYS}
 * that aren't null or undefined), for handing a component's options to
 * `renderSounds` on the server. Since 2.1.0.
 *
 * @param options - Any `WaveformSoundsOptions` (or a component's props).
 * @returns Just the render options that are set.
 */
export function pickRenderOptions(options: WaveformSoundsOptions | null | undefined): WaveformSoundsOptions {
    const out: Record<string, unknown> = {};
    for (const key of RENDER_OPTION_KEYS) {
        const value = (options as Record<string, unknown> | null | undefined)?.[key];
        if (value != null) out[key] = value;
    }
    return out as WaveformSoundsOptions;
}

/**
 * The object without its `undefined` entries (so spreading it can't erase
 * a default).
 *
 * @param obj
 */
export function defined(obj: Record<string, any> | null | undefined): Record<string, any> {
    const out: Record<string, any> = {};
    for (const k in obj ?? {}) if (obj![k] !== undefined) out[k] = obj![k];
    return out;
}

/**
 * The entries of `values` that are allowed, in the caller's order; the
 * fallback when `values` isn't a list.
 *
 * @param values
 * @param allowed
 * @param fallback
 */
export function allowedList<T extends string>(values: unknown, allowed: T[], fallback: T[]): T[] {
    return Array.isArray(values) ? values.filter((v) => allowed.includes(v)) : fallback;
}

/**
 * A whole number ≥ 0, or the fallback.
 *
 * @param value
 * @param fallback
 */
export function wholeNumber(value: unknown, fallback: number): number {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

/**
 * The render options, defaulted and validated: unknown filters, sorts and
 * columns are dropped, counts are whole numbers, `strings` is complete.
 *
 * @param options
 */
export function resolveRenderOptions(options: WaveformSoundsOptions = {}): RenderOptions {
    const o = {...RENDER_DEFAULTS, ...defined(options)};
    return {
        ...o,
        player: o.player === 'strip' ? 'strip' : 'inline',
        filters: allowedList(o.filters, FILTERS, RENDER_DEFAULTS.filters),
        sorts: allowedList(o.sorts, SORTS, RENDER_DEFAULTS.sorts),
        columns: allowedList(o.columns, COLUMNS, RENDER_DEFAULTS.columns),
        menuSearch: wholeNumber(o.menuSearch, RENDER_DEFAULTS.menuSearch),
        maxTypeChips: wholeNumber(o.maxTypeChips, RENDER_DEFAULTS.maxTypeChips),
        pageSize: wholeNumber(o.pageSize, RENDER_DEFAULTS.pageSize),
        strings: {...DEFAULT_STRINGS, ...defined(options.strings)},
    };
}
