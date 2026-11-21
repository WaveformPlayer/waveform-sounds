/**
 * The `<waveform-sounds>` custom element, modelled on the core's
 * `<waveform-player>`.
 *
 * A light-DOM wrapper: the element itself is the list's container, so the
 * stylesheet applies as it does to `[data-waveform-sounds]`, server-rendered
 * markup inside it (`renderSounds()` output) is ADOPTED exactly as it is
 * there, and `waveformsounds:*` events bubble from the tag. Configured by
 * attributes — every `data-*` option the list reads, with or without the
 * `data-` prefix (`manifest`, `page-size`, `player`, …), the unprefixed form
 * winning.
 *
 * The default entry registers it (behind the same opt-out as the scan);
 * `/no-autoinit` exports {@link defineWaveformSoundsElement}, and
 * `WaveformSounds.defineElement()` reaches it from a `<script>` page.
 *
 * @module element
 */
import { WaveformSounds } from './WaveformSounds.js';
declare global {
    interface HTMLElementTagNameMap {
        'waveform-sounds': WaveformSoundsElement;
    }
}
/**
 * Every `data-*` key `readDataOptions` reads, as its `dataset` name. The
 * element accepts each as `data-<kebab>` and as plain `<kebab>`.
 * `test/runtime/element.test.js` fails if this list and `readDataOptions`
 * drift apart.
 */
export declare const ELEMENT_OPTION_KEYS: string[];
/**
 * Read the element's options: each key from its plain attribute, else its
 * `data-` one, through the same `readDataOptions` the `data-*` contract uses
 * (so a bare boolean attribute — `<waveform-sounds auto-advance>` — is true,
 * as `data-auto-advance` is).
 *
 * @param el
 * @returns Sparse options.
 */
export declare function readElementOptions(el: Element): Record<string, any>;
declare const Base: typeof HTMLElement;
/**
 * `<waveform-sounds manifest="/previews/sounds.json" page-size="20">`.
 *
 * - `connectedCallback` builds the list in the element (adopting
 *   server-rendered markup inside it); `disconnectedCallback` destroys it —
 *   putting adopted markup back as the server sent it — unless the element
 *   is put back before the current task ends (a move keeps the list, and
 *   its playback).
 * - Changing an option attribute (either form) rebuilds the list once per
 *   task, from the sounds it holds (or from the new `manifest`).
 * - {@link WaveformSoundsElement.sounds} is the `WaveformSounds` instance.
 */
export declare class WaveformSoundsElement extends Base {
    /** The list inside this element, or `null` while disconnected. */
    sounds: WaveformSounds | null;
    /** Every option attribute, plain and `data-` prefixed. */
    static get observedAttributes(): string[];
    /** Build the list (or keep it, after a move). */
    connectedCallback(): void;
    /** Destroy the list, unless the element comes straight back (a move). */
    disconnectedCallback(): void;
    /**
     * An option attribute changed: rebuild once the task's changes are in.
     *
     * @param name
     * @param previous
     * @param value
     */
    attributeChangedCallback(name: string, previous: string | null, value: string | null): void;
}
/**
 * Register the `<waveform-sounds>` element (or the same element under
 * another name). The default entry does this on import; `/no-autoinit`
 * leaves it to you (`WaveformSounds.defineElement()` from a `<script>` page).
 * A name that is already defined is left alone.
 *
 * @param name - Tag name; must contain a hyphen.
 * @returns The registered constructor, or `undefined` outside a browser.
 */
export declare function defineWaveformSoundsElement(name?: string): CustomElementConstructor | undefined;
export {};
//# sourceMappingURL=element.d.ts.map