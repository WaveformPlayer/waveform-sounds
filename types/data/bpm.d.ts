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
export declare function bpmFilterFromRange(lo: number, hi: number, extent: {
    min: number;
    max: number;
}): {
    bpmMin: string;
    bpmMax: string;
};
/**
 * Where the handles sit for a filter: an open end at the pack's own end, a
 * set one at its value (clamped into the pack's range, so a link with
 * `?bpm=60-300` still shows sensible handles).
 *
 * @param filter
 * @param extent
 * @returns
 */
export declare function bpmRangeFromFilter(filter: {
    bpmMin?: string | number;
    bpmMax?: string | number;
}, extent: {
    min: number;
    max: number;
}): {
    lo: number;
    hi: number;
};
/**
 * A handle's position along the track, 0..1.
 *
 * @param value
 * @param extent
 * @returns
 */
export declare function bpmFraction(value: number, extent: {
    min: number;
    max: number;
}): number;
/**
 * Is a BPM limit set on either side?
 *
 * @param filter
 * @returns
 */
export declare function hasBpmFilter(filter: {
    bpmMin?: string | number;
    bpmMax?: string | number;
}): boolean;
