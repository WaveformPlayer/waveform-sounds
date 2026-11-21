/**
 * @arraypress/waveform-sounds
 * A searchable, filterable list of sounds for WaveformPlayer.
 *
 * Importing this entry registers `<waveform-sounds>` and initialises every
 * `[data-waveform-sounds]` element once the DOM is ready. Opt out page-wide with
 * `<html data-waveform-autoinit="false">` (the family's switch), or import
 * `@arraypress/waveform-sounds/no-autoinit`.
 *
 * @author ArrayPress
 * @license MIT
 */
import WaveformSounds, {defineWaveformSoundsElement} from './entry.js';

export * from './entry.js';
export default WaveformSounds;

if (typeof document !== 'undefined' && document.documentElement?.dataset?.waveformAutoinit !== 'false') {
    // The tag first: an element that upgrades now builds its own list, and
    // the scan then skips it as already claimed. Behind the same opt-out (an
    // opted-out page can call WaveformSounds.defineElement()).
    defineWaveformSoundsElement();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => WaveformSounds.init(), {once: true});
    } else {
        WaveformSounds.init();
    }
}
