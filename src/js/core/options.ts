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

import {RENDER_DEFAULTS} from '../render/options.js';
import {LOG} from '../shared/utils.js';
import type {WaveformSoundsOptions} from '../types.js';

export {RENDER_DEFAULTS};

/** Every option, with its default. */
export const DEFAULT_OPTIONS: WaveformSoundsOptions = {
    ...RENDER_DEFAULTS,
    sounds: null,
    manifest: null,
    waveformStyle: 'mirror',
    waveformColor: null,
    progressColor: null,
    barWidth: 2,
    barGap: 1,
    loop: null,
    autoAdvance: false,
    arrowAudition: true,
    // null is "unset" (the container's id, else a hash); the public type,
    // unchanged from 0.3.1, has no null, hence the cast (it emits nothing).
    idPrefix: null as unknown as string,
    urlState: false,
    playerOptions: null,
    playerClass: null,
    strings: null,
    onReady: null,
    onPlay: null,
    onPause: null,
    onEnd: null,
    onFilter: null,
    onError: null,
};

/**
 * A boolean attribute: present-and-empty or "true" → true, "false" → false.
 *
 * @param value
 * @returns undefined for anything else (not set).
 */
export function parseBool(value: string | undefined): boolean | undefined {
    if (value === '' || value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
}

/**
 * A comma list attribute ("type, key" → ['type', 'key']). An empty string
 * is an empty list (e.g. `data-sorts=""` = no sort menu).
 *
 * @param value
 */
export function parseList(value: string | undefined): string[] | undefined {
    if (value == null) return undefined;
    return value.split(',').map((x) => x.trim()).filter(Boolean);
}

/**
 * A number attribute; an empty string is "not set".
 *
 * @param value
 */
export function parseNumber(value: string | undefined): number | undefined {
    return value === undefined || value === '' ? undefined : Number(value);
}

/**
 * `data-url-state`: "true"/empty → true, "false" → false, anything else is
 * the parameter prefix.
 *
 * @param value
 */
export function parseUrlState(value: string | undefined): boolean | string | undefined {
    if (value === undefined) return undefined;
    const b = parseBool(value);
    return b === undefined ? value : b;
}

/**
 * A JSON attribute (`data-strings`, `data-player-options`). Invalid JSON is
 * reported and ignored, never thrown: a typo in markup must not take the
 * whole list down.
 *
 * @param value
 * @param name - The attribute name, for the warning.
 */
export function parseJson(value: string | undefined, name: string): Record<string, any> | undefined {
    if (!value) return undefined;
    try {
        return JSON.parse(value);
    } catch {
        console.warn(`${LOG} Ignoring invalid JSON in data-${name}`);
        return undefined;
    }
}

/**
 * The options set on a container as `data-*` attributes (kebab-case:
 * `data-page-size` → `pageSize`). Attributes that are absent (or unusable)
 * are left out, so they never override a constructor option.
 *
 * @param el
 * @returns The options found.
 */
export function readDataOptions(el: HTMLElement): Record<string, any> {
    const d = el.dataset || {};
    const out: Record<string, any> = {
        player: d.player || undefined,
        manifest: d.manifest || undefined,
        search: parseBool(d.search),
        filters: parseList(d.filters),
        sorts: parseList(d.sorts),
        showCount: parseBool(d.showCount),
        menuSearch: parseNumber(d.menuSearch),
        idPrefix: d.idPrefix || undefined,
        urlState: parseUrlState(d.urlState),
        loopToggle: parseBool(d.loopToggle),
        pageSize: parseNumber(d.pageSize),
        maxTypeChips: parseNumber(d.maxTypeChips),
        columns: parseList(d.columns),
        mergeEnharmonicKeys: parseBool(d.mergeEnharmonicKeys),
        waveformStyle: d.waveformStyle || undefined,
        waveformColor: d.waveformColor || undefined,
        progressColor: d.progressColor || undefined,
        barWidth: parseNumber(d.barWidth),
        barGap: parseNumber(d.barGap),
        loop: parseBool(d.loop),
        autoAdvance: parseBool(d.autoAdvance),
        arrowAudition: parseBool(d.arrowAudition),
        strings: parseJson(d.strings, 'strings'),
        playerOptions: parseJson(d.playerOptions, 'player-options'),
    };
    for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
    return out;
}

/**
 * Merge option sources: later ones win, and null/undefined never
 * overwrite (an unset prop must not erase a default).
 *
 * @param sources
 */
export function mergeOptions(...sources: (Record<string, any> | null | undefined)[]): Record<string, any> {
    const out: Record<string, any> = {};
    for (const src of sources) {
        if (!src) continue;
        for (const k in src) if (src[k] !== null && src[k] !== undefined) out[k] = src[k];
    }
    return out;
}
