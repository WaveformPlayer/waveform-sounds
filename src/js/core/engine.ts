/**
 * The audio engine: ONE `WaveformPlayer` (self mode) that every sound in
 * the list plays through. These helpers decide how it's configured and
 * what it's given per sound; `WaveformSounds.js` owns its lifecycle.
 *
 * @module engine
 */

/** The engine's own callbacks, which the list must always receive. */
const CALLBACKS = ['onLoad', 'onPlay', 'onPause', 'onEnd', 'onTimeUpdate', 'onError'];

/**
 * The engine player's options. The site's `playerOptions` override the
 * defaults, except two things the list depends on:
 *   - `audioMode` is always `'self'` (the list owns its audio);
 *   - the six callbacks always reach the list — a site's own callback of
 *     the same name runs as well, after it, with the same arguments.
 *
 * @param user - The site's `playerOptions`.
 * @param layout - Strip shows the engine, so it's taller.
 * @param handlers - The list's callbacks, keyed by
 *   option name (`onPlay`, …).
 * @returns Options for `new WaveformPlayer(el, options)`.
 */
export function engineOptions(user: Record<string, any> | null | undefined, layout: 'inline' | 'strip', handlers: Record<string, (...args: any[]) => void>): Record<string, any> {
    const site = user || {};
    const strip = layout === 'strip';
    const options: Record<string, any> = {
        height: strip ? 48 : 32,
        waveformStyle: strip ? 'mirror' : 'bars',
        preload: 'metadata',
        singlePlay: true,
        ...site,
        audioMode: 'self',
    };
    for (const name of CALLBACKS) {
        options[name] = (...args: any[]) => {
            handlers[name]?.(...args);
            if (typeof site[name] === 'function') site[name](...args);
        };
    }
    return options;
}

/**
 * The waveform data to hand the engine for a sound: in the strip a
 * full-resolution sidecar when there is one, otherwise the row's peaks.
 * Supplied peaks also stop a hidden engine from downloading and decoding
 * the whole file just to draw it.
 *
 * @param sound
 * @param layout
 * @returns 
 */
export function enginePeaks(sound: {peaks: number[]|null, waveform: string|null}, layout: 'inline' | 'strip'): number[] | string | null {
    return (layout === 'strip' && sound.waveform) || sound.peaks || null;
}
