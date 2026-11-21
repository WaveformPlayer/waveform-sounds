/**
 * Server-safe renderer: the component's markup as an HTML string, from the
 * same data helpers the browser uses. No DOM, no window.
 *
 * A wrapper that renders on the server (Astro, SSR React/Vue/Svelte) calls
 * {@link renderSounds} and emits the result inside a
 * `[data-waveform-sounds]` element; the browser runtime then ADOPTS that
 * markup instead of building its own, so the list is there (and readable,
 * and crawlable) before any script runs.
 *
 * The markup is the contract between the two halves: every class and
 * `data-ws-*` attribute here is read by the runtime (`core.js`,
 * `menus.js`, `rows.js`).
 *
 * @module render
 */

import {escapeHtml} from '@arraypress/text';
import {availableSorts, encodePeaks, facets, formatDuration, normalizeSounds} from '../data/sounds.js';
import {h, text} from './html.js';
import {ICONS} from './icons.js';
import {defined, pickRenderOptions, RENDER_DEFAULTS, RENDER_OPTION_KEYS, resolveRenderOptions} from './options.js';
import {bpmLabel, countText, DEFAULT_STRINGS, fill, SORT_LABEL_KEYS} from './strings.js';
import {hashString} from '../shared/utils.js';
import {bpmExtent} from '../data/bpm.js';
import type {Sound, SoundInput, SoundsSort, WaveformSoundsOptions, WaveformSoundsStrings} from '../types.js';

export {escapeHtml, RENDER_DEFAULTS, RENDER_OPTION_KEYS, pickRenderOptions, resolveRenderOptions, DEFAULT_STRINGS, countText, fill, availableSorts};

/**
 * A stable id prefix for a list's dropdowns, from its sounds: the same on
 * the server and in the browser. Two lists of the SAME sounds on one page
 * collide, so they need an `idPrefix` each.
 *
 * @param sounds
 * @returns e.g. `ws1x9k2f`.
 */
export function idBase(sounds: {url: string}[]): string {
    const signature = [sounds.length, ...sounds.map((s) => s.url)].join('|');
    return `ws${hashString(signature).toString(36)}`;
}

/**
 * Which controls the toolbar shows. Each appears only when it's enabled
 * AND the data gives it something to do: no type filter for one type, no
 * key menu for one key, no BPM range without a spread of BPMs, no loops
 * filter unless the list has both loops and one-shots, no sort menu with
 * one usable order. Types past `maxTypeChips` become a menu (a
 * pack has a handful; a whole library can have fifty).
 *
 * @param f - The sounds' facets.
 * @param o - Resolved options.
 * @returns 
 */
export function toolbarPlan(f: ReturnType<typeof facets>, o: ReturnType<typeof resolveRenderOptions>): {types: 'chips'|'menu'|null, key: boolean, bpm: boolean, loops: boolean, sorts: string[], search: boolean, loop: boolean, count: boolean} {
    const typed = o.filters.includes('type') && f.types.length > 1;
    const sorts = availableSorts(o.sorts, f);
    return {
        types: !typed ? null : f.types.length > o.maxTypeChips ? 'menu' : 'chips',
        key: o.filters.includes('key') && f.keys.length > 1,
        bpm: o.filters.includes('bpm') && f.bpm !== null && f.bpm.max > f.bpm.min,
        loops: o.filters.includes('loop') && f.loops > 0 && f.oneShots > 0,
        sorts: sorts.length > 1 ? sorts : [],
        search: !!o.search,
        loop: !!o.loopToggle,
        count: !!o.showCount,
    };
}

/**
 * Does the Loop toggle start on? An explicit `loop` option decides; left
 * unset, it's on exactly when the list marks loops (only those repeat, so
 * a one-shot still plays once).
 *
 * @param loop - The `loop` option.
 * @param f - The sounds' facets.
 * @returns 
 */
export function loopsByDefault(loop: boolean | null | undefined, f: {loops: number}): boolean {
    return loop == null ? f.loops > 0 : !!loop;
}

/** What every part of the list's markup is built from ({@link renderSounds}). */
interface RenderContext {
    o: ReturnType<typeof resolveRenderOptions>;
    s: WaveformSoundsStrings;
    f: ReturnType<typeof facets>;
    total: number;
    id: string;
}

/** A dropdown's content ({@link renderMenu}). */
export interface MenuSpec {
    id: string;
    label: string;
    prefix?: string;
    value: string;
    options: {value: string, label: string, count?: number}[];
    searchFrom: number;
    placeholder?: string;
    noMatches: string;
}

/* ── Controls ───────────────────────────────────────────────────────── */

/** The search field. */
function renderSearch(s: WaveformSoundsStrings): string {
    return h('label', {class: 'ws-search'},
        ICONS.search,
        h('span', {class: 'ws-sr'}, text(s.search)),
        h('input', {type: 'search', class: 'ws-search-input', 'data-ws-search': true, placeholder: s.searchPlaceholder, autocomplete: 'off', spellcheck: 'false'}),
    );
}

/**
 * A dropdown: a button and a popup listbox, with a search field when it
 * has more than `searchFrom` options. The runtime (`menus.js`) opens,
 * filters and navigates it; without JS the button still shows the value.
 *
 * @param name - 'type' | 'key' | 'sort' (the runtime routes by it).
 * @param m
 * @param m.id - Id prefix for this list.
 * @param m.label - Accessible name ("Type").
 * @param [m.prefix] - Visible lead-in ("Sort by"); otherwise the label is screen-reader only.
 * @param m.value - The selected value.
 * @param m.options
 * @param m.searchFrom - Options above which a search field is added.
 * @param [m.placeholder] - The search field's placeholder (no field without one).
 * @param m.noMatches - Shown when the search matches nothing.
 * @returns 
 */
export function renderMenu(name: string, m: MenuSpec): string {
    const listId = `${m.id}-${name}-list`;
    const current = m.options.find((o) => o.value === m.value) ?? m.options[0];
    const searchable = m.placeholder && m.options.length > m.searchFrom;

    const button = h('button', {type: 'button', class: 'ws-menu-btn', 'data-ws-menu-btn': true, 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-controls': listId},
        m.prefix
            ? h('span', {class: 'ws-menu-prefix'}, text(m.prefix))
            : h('span', {class: 'ws-sr'}, text(`${m.label}: `)),
        h('span', {class: 'ws-menu-value', 'data-ws-menu-value': true}, text(current.label)),
        ICONS.chevron,
    );
    const search = searchable && h('input', {
        type: 'search', class: 'ws-menu-search', 'data-ws-menu-search': true, role: 'combobox',
        'aria-expanded': 'true', 'aria-controls': listId, 'aria-autocomplete': 'list',
        'aria-label': m.placeholder, placeholder: m.placeholder, autocomplete: 'off', spellcheck: 'false',
    });
    const options = m.options.map((o, i) => h('li', {role: 'option', id: `${m.id}-${name}-${i}`, class: 'ws-menu-option', 'data-value': o.value, 'aria-selected': String(o === current)},
        ICONS.check,
        h('span', {class: 'ws-menu-text'}, text(o.label)),
        o.count != null && h('span', {class: 'ws-menu-count'}, text(o.count)),
    ));

    return h('div', {class: 'ws-menu', 'data-ws-menu': name},
        button,
        h('div', {class: 'ws-menu-pop', 'data-ws-menu-pop': true, hidden: true},
            search,
            h('ul', {class: 'ws-menu-list', role: 'listbox', id: listId, 'aria-label': m.label, tabindex: '-1', 'data-ws-menu-list': true}, options),
            h('p', {class: 'ws-menu-none', 'data-ws-menu-none': true, hidden: true}, text(m.noMatches)),
        ),
    );
}

/**
 * The BPM menu: a button ("Any BPM" / "120–128 BPM") opening a panel with a
 * two-handle range across the pack's own tempos. Each handle is a native
 * range input (keyboard, screen readers and touch for free); the two share
 * one track. The runtime (`menus.js` + the core) wires it.
 *
 * @param m
 * @param m.id - Id prefix for this list.
 * @param m.s
 * @param m.range - The slider's range: the pack's, widened to whole BPMs
 *   ({@link bpmExtent}; a pack of whole BPMs renders as it always did).
 * @returns 
 */
function renderBpmMenu({id, s, range}: {id: string, s: WaveformSoundsStrings, range: {min: number, max: number}}): string {
    const popId = `${id}-bpm-pop`;
    const handle = (attr: string, label: string, value: number) => h('input', {
        type: 'range', class: 'ws-range-input', [attr]: true, 'aria-label': label,
        min: range.min, max: range.max, step: '1', value,
    });
    return h('div', {class: 'ws-menu ws-menu--bpm', 'data-ws-menu': 'bpm'},
        h('button', {type: 'button', class: 'ws-menu-btn', 'data-ws-menu-btn': true, 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': popId},
            h('span', {class: 'ws-sr'}, text(`${s.bpm}: `)),
            h('span', {class: 'ws-menu-value', 'data-ws-menu-value': true}, text(bpmLabel({}, range, s))),
            ICONS.chevron,
        ),
        h('div', {class: 'ws-menu-pop ws-bpm-pop', id: popId, role: 'dialog', 'aria-label': s.bpm, 'data-ws-menu-pop': true, hidden: true},
            h('div', {class: 'ws-bpm-head'},
                h('span', {class: 'ws-bpm-readout', 'data-ws-bpm-readout': true, 'aria-live': 'polite'}, text(fill(s.bpmRange, range))),
                h('button', {type: 'button', class: 'ws-bpm-clear', 'data-ws-bpm-clear': true}, text(s.anyBpm)),
            ),
            h('div', {class: 'ws-range', 'data-ws-bpm-range': true},
                handle('data-ws-bpm-min', s.bpmMin, range.min),
                handle('data-ws-bpm-max', s.bpmMax, range.max),
            ),
            h('div', {class: 'ws-range-ends', 'aria-hidden': 'true'}, h('span', {}, text(range.min)), h('span', {}, text(range.max))),
        ),
    );
}

/**
 * Loops or one-shots: three buttons, one pressed ('' = both).
 */
function renderLoopFilter(s: WaveformSoundsStrings): string {
    const button = (value: string, label: string) => h('button', {type: 'button', class: 'ws-seg-btn', 'data-ws-loop-filter': value, 'aria-pressed': String(value === '')},
        h('span', {}, text(label)));
    return h('div', {class: 'ws-seg', role: 'group', 'aria-label': s.loopFilter},
        button('', s.all), button('loop', s.loops), button('one-shot', s.oneShots));
}

/** The Loop toggle, pressed or not. */
function renderLoopToggle(s: WaveformSoundsStrings, pressed: boolean): string {
    return h('button', {type: 'button', class: 'ws-loop', 'data-ws-loop': true, 'aria-pressed': String(pressed)}, ICONS.loop, h('span', {}, text(s.loop)));
}

/** One type chip ('' = all). */
function renderChip(value: string, label: string, count: number, pressed: boolean): string {
    return h('button', {type: 'button', class: 'ws-chip', 'data-ws-type': value, 'aria-pressed': String(pressed)},
        h('span', {class: 'ws-chip-label'}, text(label)), ' ', h('span', {class: 'ws-chip-count'}, text(count)));
}

/**
 * The toolbar: search, the controls row (type menu, key menu, BPM range,
 * loops or one-shots, sort menu, Loop) and the meta row (type chips + the count).
 *
 * @param plan
 * @param ctx - `{o, s, f, total, id}` from {@link renderSounds}.
 * @returns 
 */
function renderToolbar(plan: ReturnType<typeof toolbarPlan>, {o, s, f, total, id}: RenderContext): string {
    const menu = (name: string, m: Omit<MenuSpec, 'id' | 'searchFrom' | 'noMatches'>) => renderMenu(name, {id, searchFrom: o.menuSearch, noMatches: s.noMatches, ...m});
    const controls = [
        plan.types === 'menu' && menu('type', {
            label: s.types, value: '', placeholder: s.findType,
            options: [{value: '', label: s.allTypes, count: total}, ...f.types.map((t) => ({value: t.name, label: t.name, count: t.count}))],
        }),
        plan.key && menu('key', {
            label: s.key, value: '', placeholder: s.findKey,
            options: [{value: '', label: s.anyKey}, ...f.keys.map((k) => ({value: k, label: k}))],
        }),
        plan.bpm && renderBpmMenu({id, s, range: bpmExtent(f.bpm)!}),
        plan.loops && renderLoopFilter(s),
        plan.sorts.length > 0 && menu('sort', {
            label: s.sort, prefix: s.sortBy, value: plan.sorts[0],
            options: plan.sorts.map((k) => ({value: k, label: s[SORT_LABEL_KEYS[k as SoundsSort]]})),
        }),
        plan.loop && renderLoopToggle(s, loopsByDefault(o.loop, f)),
    ].filter(Boolean);

    const chips = plan.types === 'chips' && h('div', {class: 'ws-types', role: 'group', 'aria-label': s.types},
        renderChip('', s.all, total, true),
        f.types.map((t) => renderChip(t.name, t.name, t.count, false)),
    );
    const count = plan.count && h('p', {class: 'ws-count', 'data-ws-count': true, 'aria-live': 'polite'}, text(countText(total, total, s)));

    return h('div', {class: 'ws-toolbar'},
        plan.search && renderSearch(s),
        controls.length > 0 && h('div', {class: 'ws-controls'}, controls),
        // The chips and the count share a row (the count alone without chips).
        (chips || count) && h('div', {class: 'ws-meta'}, chips, count),
    );
}

/* ── Rows ───────────────────────────────────────────────────────────── */

/** The cells a column shows for a sound. */
const CELLS: Record<string, (sound: Sound) => string> = {
    type: (sound) => text(sound.type),
    bpm: (sound) => text(sound.bpm ?? ''),
    key: (sound) => text(sound.key),
    duration: (sound) => text(formatDuration(sound.duration)),
};

/**
 * One row. `index` is the sound's position in the ORIGINAL list: the
 * runtime maps rows back to sounds through it, whatever order they are
 * sorted into. Every field is also written as a `data-*` attribute, so the
 * runtime can rebuild the sounds from server markup.
 *
 * @param sound - Normalised.
 * @param index
 * @param o
 * @param hidden - Past the first page.
 * @returns 
 */
export function renderRow(sound: Sound, index: number, o: ReturnType<typeof resolveRenderOptions>, hidden: boolean = false): string {
    const s = o.strings;
    const vars = {title: sound.title};
    const cells = o.columns.map((c) => h('span', {class: `ws-cell ws-${c}`}, CELLS[c](sound)));

    return h('li', {
        class: 'ws-row',
        'data-ws-index': index,
        'data-ws-id': sound.id,
        'data-url': sound.url,
        'data-title': sound.title,
        'data-type': sound.type || null,
        'data-bpm': sound.bpm,
        'data-key': sound.key || null,
        'data-duration': sound.duration,
        'data-tags': sound.tags?.length ? sound.tags.join(',') : null,
        'data-peaks': sound.peaks ? encodePeaks(sound.peaks) : null,
        'data-waveform': sound.waveform,
        'data-download': sound.download,
        'data-loop': sound.loop ? 'true' : null,
        hidden,
    },
        h('button', {type: 'button', class: 'ws-play', 'aria-pressed': 'false', 'aria-label': fill(s.play, vars)}, ICONS.play, ICONS.pause),
        h('span', {class: 'ws-cell ws-title'},
            h('span', {class: 'ws-title-text'}, text(sound.title)),
            // A loop says so beside its name; a one-shot carries nothing.
            sound.loop && h('span', {class: 'ws-loop-mark', title: s.isLoop}, ICONS.loop, h('span', {class: 'ws-sr'}, text(s.isLoop))),
        ),
        // Wide rows: `display: contents` makes each cell a column. Narrow
        // rows: one line under the title.
        cells.length > 0 && h('span', {class: 'ws-cells'}, cells),
        o.player === 'inline' && h('span', {class: 'ws-wave', role: 'slider', 'aria-label': fill(s.seek, vars), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', tabindex: '-1'},
            h('canvas', {class: 'ws-canvas', 'aria-hidden': 'true'})),
        // Optional, per sound: a plain link. Rows without one carry nothing.
        sound.download && h('a', {class: 'ws-download', href: sound.download, download: true, 'aria-label': fill(s.download, vars)}, ICONS.download),
    );
}

/* ── The whole list ─────────────────────────────────────────────────── */

/**
 * What follows the rows: the empty state, "Show more", the engine's slot
 * (visible only in the strip layout) and a live region for announcements.
 */
function renderFooter({o, s, total}: RenderContext): string {
    const page = o.pageSize > 0 ? o.pageSize : total;
    const more = Math.max(0, total - page);
    const strip = o.player === 'strip';
    return [
        h('p', {class: 'ws-empty', 'data-ws-empty': true, hidden: true}, text(s.empty), ' ',
            h('button', {type: 'button', class: 'ws-clear', 'data-ws-clear': true}, text(s.clear))),
        h('button', {type: 'button', class: 'ws-more', 'data-ws-more': true, hidden: more === 0}, text(fill(s.showMore, {count: Math.min(more, page)}))),
        h('div', {class: strip ? 'ws-engine ws-engine--strip' : 'ws-engine', 'data-ws-engine': true, hidden: !strip}),
        h('p', {class: 'ws-sr', 'data-ws-status': true, 'aria-live': 'polite'}),
    ].join('');
}

/**
 * The whole component's inner markup.
 *
 * @param sounds - Sounds (normalised or raw; normalised here).
 * @param options - Render options (see `WaveformSoundsOptions`).
 * @returns HTML for the inside of `[data-waveform-sounds]`.
 */
export function renderSounds(sounds: SoundInput[], options: WaveformSoundsOptions = {}): string {
    const o = resolveRenderOptions(options);
    const list = normalizeSounds(sounds);
    const ctx: RenderContext = {o, s: o.strings, f: facets(list), total: list.length, id: o.idPrefix || idBase(list)};
    const page = o.pageSize > 0 ? o.pageSize : Infinity;
    return renderToolbar(toolbarPlan(ctx.f, o), ctx)
        + h('ul', {class: `ws-list ws-list--${o.player}`, role: 'list', 'data-ws-list': true},
            list.map((sound, i) => renderRow(sound, i, o, i >= page)))
        + renderFooter(ctx);
}

/**
 * The `data-*` attributes that carry the render options set in `options` to
 * the runtime (`data-page-size="20"`, `data-filters=""`, `data-strings='{…}'`),
 * in the form `readDataOptions` reads — so the browser keeps what the server
 * drew instead of falling back to the defaults (re-paging 20 rows to 50).
 * Only options that are set are written; `player` is always written by
 * {@link renderSoundsElement}. Since 2.1.0.
 *
 * @param options
 * @returns Attributes, in {@link RENDER_OPTION_KEYS} order.
 */
export function renderOptionAttributes(options: WaveformSoundsOptions = {}): Record<string, string> {
    const set = pickRenderOptions(options) as Record<string, unknown>;
    const o = resolveRenderOptions(options) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const key of RENDER_OPTION_KEYS) {
        if (key === 'player' || !(key in set)) continue;
        const name = `data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
        if (key === 'strings') {
            const strings = defined(set.strings as Record<string, unknown>);
            if (Object.keys(strings).length) out[name] = JSON.stringify(strings);
        } else if (key === 'loop' || key === 'idPrefix') {
            out[name] = String(set[key]);
        } else {
            const value = o[key];
            out[name] = Array.isArray(value) ? value.join(',') : String(value);
        }
    }
    return out;
}

/**
 * The full element, for callers who want one string: the wrapper div with
 * its `data-waveform-sounds` marker, its `data-player`, a `data-*` attribute
 * for every other render option set (see {@link renderOptionAttributes}) and
 * the inner markup. The inner markup is exactly {@link renderSounds}'.
 *
 * @param sounds
 * @param options
 * @param className - Extra classes for the wrapper.
 * @returns 
 */
export function renderSoundsElement(sounds: SoundInput[], options: WaveformSoundsOptions = {}, className: string = ''): string {
    const o = resolveRenderOptions(options);
    const cls = ['waveform-sounds', `waveform-sounds--${o.player}`, className].filter(Boolean).join(' ');
    return h('div', {class: cls, 'data-waveform-sounds': true, 'data-player': o.player, ...renderOptionAttributes(options)}, renderSounds(sounds, options));
}
