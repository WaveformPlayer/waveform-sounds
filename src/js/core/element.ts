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

import {WaveformSounds} from './WaveformSounds.js';
import {readDataOptions} from './options.js';
import {LOG} from '../shared/utils.js';
import type {SoundInput} from '../types.js';

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
export const ELEMENT_OPTION_KEYS = [
    'player', 'manifest', 'search', 'filters', 'sorts', 'showCount', 'menuSearch', 'idPrefix', 'urlState',
    'loopToggle', 'pageSize', 'maxTypeChips', 'columns', 'waveformStyle', 'waveformColor', 'progressColor',
    'barWidth', 'barGap', 'loop', 'autoAdvance', 'arrowAudition', 'strings', 'playerOptions', 'mergeEnharmonicKeys',
];

/**
 * `pageSize` → `page-size`.
 *
 * @param key
 */
const kebab = (key: string): string => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * Read the element's options: each key from its plain attribute, else its
 * `data-` one, through the same `readDataOptions` the `data-*` contract uses
 * (so a bare boolean attribute — `<waveform-sounds auto-advance>` — is true,
 * as `data-auto-advance` is).
 *
 * @param el
 * @returns Sparse options.
 */
export function readElementOptions(el: Element): Record<string, any> {
    const dataset: Record<string, string> = {};
    for (const key of ELEMENT_OPTION_KEYS) {
        const name = kebab(key);
        const value = el.getAttribute(name) ?? el.getAttribute(`data-${name}`);
        if (value != null) dataset[key] = value;
    }
    return readDataOptions({dataset} as unknown as HTMLElement);
}

// Defined on any host: SSR and plain-Node imports have no HTMLElement, and
// this module must still evaluate there (the class is only ever constructed
// by a browser's customElements).
const Base = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;

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
export class WaveformSoundsElement extends Base {
    /** The list inside this element, or `null` while disconnected. */
    declare sounds: WaveformSounds | null;
    /** @internal A disconnection waiting to see whether the element comes back. */ declare _leaving: ReturnType<typeof setTimeout> | undefined;
    /** @internal Attribute changes batched into one rebuild ('manifest': refetch). */ declare _pending: 'rebuild' | 'manifest' | undefined;

    /** Every option attribute, plain and `data-` prefixed. */
    static get observedAttributes(): string[] {
        return ELEMENT_OPTION_KEYS.flatMap((key) => [kebab(key), `data-${kebab(key)}`]);
    }

    /** Build the list (or keep it, after a move). */
    connectedCallback(): void {
        if (this._leaving !== undefined) {
            clearTimeout(this._leaving);
            this._leaving = undefined;
            return;
        }
        if (!this.sounds) this._build();
    }

    /** Destroy the list, unless the element comes straight back (a move). */
    disconnectedCallback(): void {
        clearTimeout(this._leaving);
        this._leaving = setTimeout(() => {
            this._leaving = undefined;
            if (!this.isConnected) this._teardown();
        }, 0);
    }

    /**
     * An option attribute changed: rebuild once the task's changes are in.
     *
     * @param name
     * @param previous
     * @param value
     */
    attributeChangedCallback(name: string, previous: string | null, value: string | null): void {
        // Before connection (and during the upgrade of parsed markup) the
        // attributes are simply read by connectedCallback.
        if (!this.sounds || previous === value) return;
        const kind = name.replace(/^data-/, '') === 'manifest' ? 'manifest' : 'rebuild';
        if (this._pending) {
            if (kind === 'manifest') this._pending = kind;
            return;
        }
        this._pending = kind;
        queueMicrotask(() => {
            const pending = this._pending;
            this._pending = undefined;
            if (this.sounds) this._rebuild(pending === 'manifest');
        });
    }

    /**
     * The options the list reads off this element (`WaveformSounds` calls it
     * in place of reading `data-*` alone).
     * @internal
     */
    _wsOptions(): Record<string, any> {
        return readElementOptions(this);
    }

    /**
     * Build the list into the element.
     * @internal
     */
    _build(options: {sounds?: SoundInput[]} = {}): void {
        // A declarative scan (`data-waveform-sounds` on this tag) or a script
        // may have built a list here first; the element's own wins.
        WaveformSounds.getInstance(this)?.destroy({restore: true});
        try {
            this.sounds = new WaveformSounds(this, options);
        } catch (error) {
            this.sounds = null;
            console.error(`${LOG} Failed to initialise:`, error, this);
        }
    }

    /**
     * Destroy the list, putting server-rendered markup back as it came.
     * @internal
     */
    _teardown(): void {
        this.sounds?.destroy({restore: true});
        this.sounds = null;
    }

    /**
     * Rebuild for new options: re-rendered from the sounds the list holds
     * (the markup must follow the new options), or fetched afresh when the
     * manifest changed.
     * @internal
     */
    _rebuild(refetch: boolean): void {
        // Not built yet (its manifest still loading): there is nothing to
        // keep, so it loads again.
        const sounds = refetch || !this.sounds!.$ ? undefined : (this.sounds!.sounds as SoundInput[]).slice();
        this._teardown();
        this.innerHTML = '';
        this._build(sounds ? {sounds} : {});
    }
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
export function defineWaveformSoundsElement(name: string = 'waveform-sounds'): CustomElementConstructor | undefined {
    if (typeof customElements === 'undefined') return undefined;
    const existing = customElements.get(name);
    if (existing) return existing;
    // A constructor can only be registered once, so each name gets its own
    // subclass (all of them `instanceof WaveformSoundsElement`).
    const element = class extends WaveformSoundsElement {};
    customElements.define(name, element);
    return element;
}
