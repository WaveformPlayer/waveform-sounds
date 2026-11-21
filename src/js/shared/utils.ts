/**
 * Small shared helpers with no state. The pure ones run anywhere; the two
 * that take an element only read from it.
 *
 * @module utils
 */

/** Prefix for every console message and thrown error. */
export const LOG = '[WaveformSounds]';

/**
 * Clamp a number into a range.
 *
 * @param value
 * @param min
 * @param max
 * @returns 
 */
export function clamp(value: number, min: number = 0, max: number = 1): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Where a pointer sits across a box, as a fraction 0..1 — the seek
 * position of a click on a row waveform.
 *
 * @param clientX - The pointer's x (viewport coordinates).
 * @param rect - The box (getBoundingClientRect()).
 * @returns 0..1; 0 for a box with no width.
 */
export function pointerFraction(clientX: number, rect: {left: number, width: number}): number {
    return rect && rect.width ? clamp((clientX - rect.left) / rect.width) : 0;
}

/**
 * Is the element a place the user types into? Keyboard shortcuts (`/`)
 * must not fire there.
 *
 * @param el
 * @returns 
 */
export function isTyping(el: Element | null | undefined): boolean {
    return !!el && ((el as HTMLElement).isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName));
}

/**
 * Dispatch a bubbling `waveformsounds:<name>` CustomEvent from an element.
 * Every event the list emits goes through here, so they share one shape:
 * the detail plus the instance that sent it.
 *
 * @param target
 * @param name - Without the prefix (`'play'`).
 * @param detail
 * @returns The event dispatched.
 */
export function emit(target: EventTarget, name: string, detail: Record<string, any>): CustomEvent {
    const event = new CustomEvent(`waveformsounds:${name}`, {bubbles: true, detail});
    target.dispatchEvent(event);
    return event;
}

/**
 * A small, stable string hash (djb2, 32-bit) — for ids that must come out
 * the same on the server and in the browser. Not cryptographic.
 *
 * @param str
 * @returns An unsigned 32-bit integer.
 */
export function hashString(str: string): number {
    let hash = 5381;
    for (const char of str) hash = (hash * 33 + char.codePointAt(0)!) >>> 0;
    return hash;
}
