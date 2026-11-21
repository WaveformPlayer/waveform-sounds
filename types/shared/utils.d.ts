/**
 * Small shared helpers with no state. The pure ones run anywhere; the two
 * that take an element only read from it.
 *
 * @module utils
 */
/** Prefix for every console message and thrown error. */
export declare const LOG = "[WaveformSounds]";
/**
 * Clamp a number into a range.
 *
 * @param value
 * @param min
 * @param max
 */
export declare function clamp(value: number, min?: number, max?: number): number;
/**
 * Where a pointer sits across a box, as a fraction 0..1 — the seek
 * position of a click on a row waveform.
 *
 * @param clientX - The pointer's x (viewport coordinates).
 * @param rect - The box (getBoundingClientRect()).
 * @returns 0..1; 0 for a box with no width.
 */
export declare function pointerFraction(clientX: number, rect: {
    left: number;
    width: number;
}): number;
/**
 * Is the element a place the user types into? Keyboard shortcuts (`/`)
 * must not fire there.
 *
 * @param el
 */
export declare function isTyping(el: Element | null | undefined): boolean;
/**
 * Dispatch a bubbling, composed `waveformsounds:<name>` CustomEvent from an
 * element (composed: it leaves a shadow root, like the core's lifecycle
 * events).
 * Every event the list emits goes through here, so they share one shape:
 * the detail plus the instance that sent it.
 *
 * @param target
 * @param name - Without the prefix (`'play'`).
 * @param detail
 * @returns The event dispatched.
 */
export declare function emit(target: EventTarget, name: string, detail: Record<string, any>): CustomEvent;
/**
 * A small, stable string hash (djb2, 32-bit) — for ids that must come out
 * the same on the server and in the browser. Not cryptographic.
 *
 * @param str
 * @returns An unsigned 32-bit integer.
 */
export declare function hashString(str: string): number;
//# sourceMappingURL=utils.d.ts.map