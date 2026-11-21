/**
 * Every word the list shows or announces, so a site can translate it
 * (`strings` option, or `data-strings` JSON). `{title}`, `{count}` and
 * `{total}` are filled in.
 *
 * @module strings
 */
import type { Sound, SoundsColumn, SoundsSort, WaveformSoundsStrings } from '../types.js';
/** The English defaults. */
export declare const DEFAULT_STRINGS: WaveformSoundsStrings;
/** The label each sort order shows in the Sort menu. */
export declare const SORT_LABEL_KEYS: Record<SoundsSort, keyof WaveformSoundsStrings>;
/**
 * Fill `{name}` placeholders; unknown ones are left as written.
 *
 * @param template
 * @param vars
 */
export declare function fill(template: string, vars?: Record<string, string | number>): string;
/**
 * The BPM menu's label: "Any BPM", or the range the handles hold
 * ("120–128 BPM"; an open end shows the pack's own end).
 *
 * @param filter
 * @param extent - The pack's BPM range.
 * @param strings
 */
export declare function bpmLabel(filter: {
    bpmMin?: string | number;
    bpmMax?: string | number;
}, extent: {
    min: number;
    max: number;
}, strings?: typeof DEFAULT_STRINGS): string;
/**
 * The count line: "300 sounds", "1 sound", "12 of 300 sounds".
 *
 * @param shown - Sounds matching the filter.
 * @param total - All sounds.
 * @param strings
 */
export declare function countText(shown: number, total: number, strings?: typeof DEFAULT_STRINGS): string;
/**
 * A key as a screen reader should say it: "Bm" → "B minor", "F#" → "F
 * sharp major" (a bare "F#m" is read "F number m"). A label that isn't a
 * key is said as written.
 *
 * @param key - A normalised key.
 * @param strings
 */
export declare function spokenKey(key: string, strings?: WaveformSoundsStrings): string;
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
export declare function rowSummary(sound: Sound, columns: SoundsColumn[], strings?: WaveformSoundsStrings): string;
//# sourceMappingURL=strings.d.ts.map