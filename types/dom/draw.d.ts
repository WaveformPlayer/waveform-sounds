/**
 * The row waveform: a small canvas of mirrored bars (or plain bars) drawn
 * from low-resolution peaks, with the played part in the progress colour.
 *
 * Deliberately NOT a WaveformPlayer per row. A pack can have 300 sounds;
 * 300 players would be 300 resize observers, theme watchers and option
 * pipelines for what is, until one is played, a static picture. One engine
 * player does the audio; these are pictures with a progress fill.
 *
 * @module draw
 */
/**
 * Size a canvas to its box at the device pixel ratio. Returns the CSS size,
 * or null when the canvas has no box (hidden row, jsdom).
 * @param canvas
 */
export declare function fitCanvas(canvas: HTMLCanvasElement): {
    width: number;
    height: number;
    dpr: number;
} | null;
/**
 * Resample peaks to `count` bars, whatever their number (64 or 128 from
 * waveform-gen, any length of `wp1:`). Fewer bars than peaks: the max of
 * each bucket, so transients survive. More bars than peaks: linear
 * interpolation between neighbouring peaks — repeating each peak drew
 * flat steps (64 peaks across a 400px row were plateaus three bars wide).
 * @param peaks
 * @param count
 */
export declare function resample(peaks: number[], count: number): any[];
/**
 * The rectangles of a row waveform, in CSS pixels. Pure: the geometry is
 * separate from the canvas so it can be tested (and reused for both
 * passes of {@link drawRowWaveform}).
 *
 * Bars are normalised to the loudest one, so a quiet one-shot isn't a
 * flat line, and never shorter than 4% of the height.
 *
 * @param peaks - 0..1.
 * @param width - Canvas width (CSS px).
 * @param height - Canvas height (CSS px).
 * @param o
 */
export declare function barRects(peaks: number[], width: number, height: number, o: {
    style: 'mirror' | 'bars';
    barWidth: number;
    barGap: number;
}): {
    x: number;
    y: number;
    w: number;
    h: number;
}[];
/**
 * Draw a row waveform: every bar in the waveform colour, then the same
 * bars again in the progress colour, CLIPPED at the playhead. The played
 * part grows by the pixel — through the middle of a bar — rather than a
 * whole bar at a time, which on a short clip stepped visibly (an 8-second
 * loop across ~120 bars moved in ~15 jumps a second however fast it was
 * redrawn).
 *
 * @param canvas
 * @param peaks - 0..1. Null draws a flat placeholder line.
 * @param progress - 0..1 played.
 * @param o
 */
export declare function drawRowWaveform(canvas: HTMLCanvasElement, peaks: number[] | null, progress: number, o: {
    style: 'mirror' | 'bars';
    color: string;
    progressColor: string;
    barWidth: number;
    barGap: number;
}): void;
//# sourceMappingURL=draw.d.ts.map