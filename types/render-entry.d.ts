/**
 * `@arraypress/waveform-sounds/render` — the DOM-free half, for server
 * rendering. Importing it never touches `window` or `document`.
 */
export { renderSounds, renderSoundsElement, DEFAULT_STRINGS, escapeHtml, RENDER_OPTION_KEYS, pickRenderOptions } from './render/markup.js';
export { normalizeSounds, parseManifest, encodePeaks, decodePeaks, normalizeKey, facets, formatDuration } from './data/sounds.js';
export type { SoundInput, Sound, SoundsManifest, WaveformSoundsOptions, WaveformSoundsStrings } from './types.js';
//# sourceMappingURL=render-entry.d.ts.map