/**
 * The BPM range control's arithmetic: between the two slider handles and the
 * filter, and the label its menu button shows. Pure, so the server renderer
 * and the runtime agree.
 *
 * A handle resting at an END of the pack's range is "no limit on that side",
 * not a limit at that value: sounds with no BPM are hidden by any BPM filter,
 * so a slider left wide open must not filter at all.
 *
 * @module bpm
 */

/**
 * The filter for a pair of handle positions.
 *
 * @param lo - The lower handle.
 * @param hi - The upper handle.
 * @param extent - The pack's BPM range (`facets().bpm`).
 * @returns `''` for an open end.
 */
export function bpmFilterFromRange(lo: number, hi: number, extent: {min: number, max: number}): {bpmMin: string, bpmMax: string} {
    const a = Math.min(lo, hi), b = Math.max(lo, hi);
    return {
        bpmMin: a > extent.min ? String(a) : '',
        bpmMax: b < extent.max ? String(b) : '',
    };
}

/**
 * Where the handles sit for a filter: an open end at the pack's own end, a
 * set one at its value (clamped into the pack's range, so a link with
 * `?bpm=60-300` still shows sensible handles).
 *
 * @param filter
 * @param extent
 * @returns 
 */
export function bpmRangeFromFilter(filter: {bpmMin?: string|number, bpmMax?: string|number}, extent: {min: number, max: number}): {lo: number, hi: number} {
    const read = (v: string | number | undefined, fallback: number): number => {
        const n = Number(v);
        return v === '' || v == null || !Number.isFinite(n) ? fallback : Math.min(Math.max(n, extent.min), extent.max);
    };
    const lo = read(filter.bpmMin, extent.min);
    const hi = read(filter.bpmMax, extent.max);
    return lo <= hi ? {lo, hi} : {lo: hi, hi: lo};
}

/**
 * A handle's position along the track, 0..1.
 *
 * @param value
 * @param extent
 * @returns 
 */
export function bpmFraction(value: number, extent: {min: number, max: number}): number {
    const span = extent.max - extent.min;
    return span > 0 ? Math.min(Math.max((value - extent.min) / span, 0), 1) : 0;
}

/**
 * Is a BPM limit set on either side?
 *
 * @param filter
 * @returns 
 */
export function hasBpmFilter(filter: {bpmMin?: string|number, bpmMax?: string|number}): boolean {
    return (filter.bpmMin != null && filter.bpmMin !== '') || (filter.bpmMax != null && filter.bpmMax !== '');
}
