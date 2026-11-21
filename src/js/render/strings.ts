/**
 * Every word the list shows or announces, so a site can translate it
 * (`strings` option, or `data-strings` JSON). `{title}`, `{count}` and
 * `{total}` are filled in.
 *
 * @module strings
 */

import {bpmRangeFromFilter, hasBpmFilter} from '../data/bpm.js';
import {parseKey} from '../data/keys.js';
import {formatDuration} from '../data/sounds.js';
import type {Sound, SoundsColumn, SoundsSort, WaveformSoundsStrings} from '../types.js';

/** The English defaults. */
export const DEFAULT_STRINGS: WaveformSoundsStrings = {
    search: 'Search sounds',
    searchPlaceholder: 'Search sounds…',
    all: 'All',
    types: 'Type',
    key: 'Key',
    anyKey: 'Any key',
    allTypes: 'All types',
    findType: 'Find a type…',
    findKey: 'Find a key…',
    noMatches: 'No matches',
    bpm: 'BPM',
    bpmMin: 'Min BPM',
    bpmMax: 'Max BPM',
    anyBpm: 'Any BPM',
    bpmRange: '{min}–{max} BPM',
    sort: 'Sort',
    sortBy: 'Sort by',
    sortDefault: 'Default',
    sortTitle: 'Name',
    sortBpm: 'BPM',
    sortKey: 'Key',
    sortDuration: 'Length',
    loop: 'Loop',
    loopFilter: 'Loops or one-shots',
    loops: 'Loops',
    oneShots: 'One-shots',
    isLoop: 'Loop',
    play: 'Play {title}',
    pause: 'Pause {title}',
    seek: 'Seek {title}',
    seekValue: '{time} of {duration}',
    download: 'Download {title}',
    count: '{count} sounds',
    countOne: '1 sound',
    countFiltered: '{count} of {total} sounds',
    showMore: 'Show {count} more',
    empty: 'No sounds match.',
    clear: 'Clear filters',
    nowPlaying: 'Playing {title}',
    playError: 'Could not play {title}',
    loadError: 'Could not load the sounds.',
    noSounds: 'No sounds.',
    rowBpm: '{bpm} BPM',
    rowKey: 'key {key}',
    rowDuration: '{duration}',
    keyMajor: '{note} major',
    keyMinor: '{note} minor',
    noteSharp: '{note} sharp',
    noteFlat: '{note} flat',
    listSeparator: ', ',
};

/** The label each sort order shows in the Sort menu. */
export const SORT_LABEL_KEYS: Record<SoundsSort, keyof WaveformSoundsStrings> = {
    default: 'sortDefault',
    title: 'sortTitle',
    bpm: 'sortBpm',
    key: 'sortKey',
    duration: 'sortDuration',
};

/**
 * Fill `{name}` placeholders; unknown ones are left as written.
 *
 * @param template
 * @param vars
 */
export function fill(template: string, vars: Record<string, string|number> = {}): string {
    return String(template).replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

/**
 * The BPM menu's label: "Any BPM", or the range the handles hold
 * ("120–128 BPM"; an open end shows the pack's own end).
 *
 * @param filter
 * @param extent - The pack's BPM range.
 * @param strings
 */
export function bpmLabel(filter: {bpmMin?: string|number, bpmMax?: string|number}, extent: {min: number, max: number}, strings: typeof DEFAULT_STRINGS = DEFAULT_STRINGS): string {
    if (!hasBpmFilter(filter)) return strings.anyBpm;
    const {lo, hi} = bpmRangeFromFilter(filter, extent);
    return fill(strings.bpmRange, {min: lo, max: hi});
}

/**
 * The count line: "300 sounds", "1 sound", "12 of 300 sounds".
 *
 * @param shown - Sounds matching the filter.
 * @param total - All sounds.
 * @param strings
 */
export function countText(shown: number, total: number, strings: typeof DEFAULT_STRINGS = DEFAULT_STRINGS): string {
    if (shown !== total) return fill(strings.countFiltered, {count: shown, total});
    return total === 1 ? strings.countOne : fill(strings.count, {count: total});
}

/**
 * A key as a screen reader should say it: "Bm" → "B minor", "F#" → "F
 * sharp major" (a bare "F#m" is read "F number m"). A label that isn't a
 * key is said as written.
 *
 * @param key - A normalised key.
 * @param strings
 */
export function spokenKey(key: string, strings: WaveformSoundsStrings = DEFAULT_STRINGS): string {
    const k = parseKey(key);
    if (!k) return key;
    const letter = k.root[0], acc = k.root.slice(1);
    const note = acc === '#' ? fill(strings.noteSharp, {note: letter}) : acc === 'b' ? fill(strings.noteFlat, {note: letter}) : letter;
    return fill(k.minor ? strings.keyMinor : strings.keyMajor, {note});
}

/**
 * What a row's cells say, for a screen reader: the visible cells read "Bass
 * loops 130 Bm 0:07"; this reads "Bass loops, 130 BPM, key B minor, 0:07"
 * (and ", Loop" for a loop). Only the columns the row shows, only the
 * values it has. Since 2.2.0.
 *
 * @param sound
 * @param columns - The row's columns, in order.
 * @param strings
 * @returns '' when there is nothing to say.
 */
export function rowSummary(sound: Sound, columns: SoundsColumn[], strings: WaveformSoundsStrings = DEFAULT_STRINGS): string {
    const parts: string[] = [];
    for (const c of columns) {
        if (c === 'type' && sound.type) parts.push(sound.type);
        else if (c === 'bpm' && sound.bpm != null) parts.push(fill(strings.rowBpm, {bpm: sound.bpm}));
        else if (c === 'key' && sound.key) parts.push(fill(strings.rowKey, {key: spokenKey(sound.key, strings)}));
        else if (c === 'duration') {
            const d = formatDuration(sound.duration);
            if (d) parts.push(fill(strings.rowDuration, {duration: d}));
        }
    }
    if (sound.loop) parts.push(strings.isLoop);
    return parts.join(strings.listSeparator);
}
