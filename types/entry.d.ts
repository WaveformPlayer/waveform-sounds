/**
 * @arraypress/waveform-sounds — public surface, without the import-time
 * auto-init scan (`index.js` adds that). Anything new belongs here.
 *
 * @module entry
 */
import { WaveformSounds, DEFAULT_OPTIONS } from './core/WaveformSounds.js';
import { encodePeaks, decodePeaks, normalizeKey, normalizeSounds, parseManifest, facets, matches, sortSounds, formatDuration } from './data/sounds.js';
import { renderSounds, renderSoundsElement, DEFAULT_STRINGS } from './render/markup.js';
import type { WaveformSoundsEventMap } from './types.js';
declare global {
    interface Window {
        /** The script-tag global, set when the bundle loads in a browser. */
        WaveformSounds: typeof WaveformSounds;
    }
    interface HTMLElementEventMap extends WaveformSoundsEventMap {
    }
}
export default WaveformSounds;
export { WaveformSounds, DEFAULT_OPTIONS, DEFAULT_STRINGS, encodePeaks, decodePeaks, normalizeKey, normalizeSounds, parseManifest, facets, matches, sortSounds, formatDuration, renderSounds, renderSoundsElement, };
export type { SoundInput, Sound, SoundsManifest, SoundsFilter, SoundsLoopFilter, SoundsSort, SoundsLayout, SoundsFilterControl, SoundsColumn, WaveformSoundsStrings, WaveformSoundsOptions, WaveformSoundsEventMap, } from './types.js';
