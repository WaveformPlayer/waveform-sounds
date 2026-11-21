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
 * The range the slider spans: the pack's BPMs widened to whole numbers
 * (the handles step by 1, so a pack whose fastest loop is 128.5 BPM needs
 * an end at 129, or the top handle could never reach it). A pack of whole
 * BPMs is unchanged.
 *
 * @param range - The pack's BPM range (`facets().bpm`).
 * @returns The slider's ends, or null when the pack has no BPMs.
 */
export declare function bpmExtent(range: {
    min: number;
    max: number;
} | null | undefined): {
    min: number;
    max: number;
} | null;
/**
 * The filter for a pair of handle positions.
 *
 * @param lo - The lower handle.
 * @param hi - The upper handle.
 * @param extent - The slider's range ({@link bpmExtent}).
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
//# sourceMappingURL=bpm.d.ts.map