/**
 * @arraypress/waveform-sounds — public surface, without the import-time
 * side effects: the auto-init scan and registering `<waveform-sounds>`
 * (`index.js` adds those). Anything new belongs here.
 *
 * @module entry
 */
import {WaveformSounds, DEFAULT_OPTIONS} from './core/WaveformSounds.js';
import {WaveformSoundsElement, defineWaveformSoundsElement} from './core/element.js';
import {
    encodePeaks, decodePeaks, normalizeKey, normalizeSounds, parseManifest, facets, matches, sortSounds, formatDuration,
} from './data/sounds.js';
import {renderSounds, renderSoundsElement, DEFAULT_STRINGS, RENDER_OPTION_KEYS, pickRenderOptions} from './render/markup.js';
import type {WaveformSoundsEventMap} from './types.js';

declare global {
    interface Window {
        /** The script-tag global, set when the bundle loads in a browser. */
        WaveformSounds: typeof WaveformSounds;
    }
    interface HTMLElementEventMap extends WaveformSoundsEventMap {}
    interface DocumentEventMap extends WaveformSoundsEventMap {}
    interface WindowEventMap extends WaveformSoundsEventMap {}
}

WaveformSounds.utils = {encodePeaks, decodePeaks, normalizeKey, normalizeSounds, parseManifest, facets, matches, sortSounds, formatDuration, renderSounds};
WaveformSounds.DEFAULT_OPTIONS = DEFAULT_OPTIONS;
WaveformSounds.DEFAULT_STRINGS = DEFAULT_STRINGS;
// The element definer as a static too, so a CDN page that opted out of
// auto-init (no ES module import to reach the named export) can register
// the tag itself: `WaveformSounds.defineElement()`. Like the core's.
WaveformSounds.defineElement = defineWaveformSoundsElement;

// CDN / <script> usage: a global, like the rest of the family.
if (typeof window !== 'undefined') window.WaveformSounds = WaveformSounds;

export default WaveformSounds;
export {
    WaveformSounds, DEFAULT_OPTIONS, DEFAULT_STRINGS,
    encodePeaks, decodePeaks, normalizeKey, normalizeSounds, parseManifest, facets, matches, sortSounds, formatDuration,
    renderSounds, renderSoundsElement, RENDER_OPTION_KEYS, pickRenderOptions,
    WaveformSoundsElement, defineWaveformSoundsElement,
};

// The public types (sounds, options, filter, events), for `import type { ... }`.
export type {
    SoundInput,
    Sound,
    SoundsManifest,
    SoundsFilter,
    SoundsLoopFilter,
    SoundsSort,
    SoundsLayout,
    SoundsFilterControl,
    SoundsColumn,
    WaveformSoundsStrings,
    WaveformSoundsOptions,
    WaveformSoundsEventMap,
    WaveformSoundsInstanceEventMap,
} from './types.js';
