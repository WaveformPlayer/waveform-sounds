/**
 * Every word the list shows or announces, so a site can translate it
 * (`strings` option, or `data-strings` JSON). `{title}`, `{count}` and
 * `{total}` are filled in.
 *
 * @module strings
 */
import type { SoundsSort, WaveformSoundsStrings } from '../types.js';
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
//# sourceMappingURL=strings.d.ts.map