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
 * Player options that describe ONE track. The engine plays every sound in
 * the list, so a site value would be wrong for all but one of them; the
 * list passes each sound's own to `loadTrack()` instead (and the core resets
 * them on every `loadTrack()` that doesn't).
 */
const PER_TRACK = ['duration', 'downloadUrl', 'downloadName'];

/**
 * The engine player's options. The site's `playerOptions` override the
 * defaults, except what the list depends on:
 *   - `audioMode` is always `'self'` (the list owns its audio);
 *   - `loop` and `showLoop` are always off: the list owns looping (its Loop
 *     toggle, which repeats only the sounds marked as loops). The player's
 *     own loop would stop `ended`, so `autoAdvance` and the row state would
 *     stall, and its toggle would loop one-shots behind the list's back;
 *   - the per-track options (`duration`, `downloadUrl`, `downloadName`) are
 *     dropped: each sound's come with it (see {@link engineTrack});
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
        loop: false,
        showLoop: false,
    };
    for (const name of PER_TRACK) delete options[name];
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
 */
export function enginePeaks(sound: {peaks: number[]|null, waveform: string|null}, layout: 'inline' | 'strip'): number[] | string | null {
    return (layout === 'strip' && sound.waveform) || sound.peaks || null;
}

/** What `loadTrack()` is given for one sound (see {@link engineTrack}). */
export interface EngineTrack {
    waveform: number[] | string | null;
    autoplay: boolean;
    duration?: number;
    downloadUrl?: string;
    preload?: string;
}

/**
 * The `loadTrack()` options for a sound: its peaks (see {@link enginePeaks}),
 * its known length — so the player shows the right total, places a seek and
 * fills the Media Session scrubber before the audio's metadata arrives,
 * which with `preload: 'none'` is only once it plays — and its download
 * link, so a `showDownload` engine offers what the row offers.
 *
 * `preload` is given every time because the core keeps the last one: the
 * strip CUES its first sound with `'none'` (it shows the title, length and
 * peaks from the data, and fetches nothing until it plays), and the next
 * sound played must get the engine's own preload back.
 *
 * @param sound
 * @param layout
 * @param autoplay - Start once loaded (false: cue only).
 * @param preload - The media element's `preload` for this sound.
 */
export function engineTrack(sound: {peaks: number[]|null, waveform: string|null, duration: number|null, download: string|null}, layout: 'inline' | 'strip', autoplay: boolean, preload?: string): EngineTrack {
    const track: EngineTrack = {waveform: enginePeaks(sound, layout), autoplay};
    if (preload) track.preload = preload;
    if (sound.duration != null && sound.duration > 0) track.duration = sound.duration;
    if (sound.download) track.downloadUrl = sound.download;
    return track;
}
