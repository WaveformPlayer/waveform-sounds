/**
 * The dropdowns (type / key / sort): a button and a popup listbox, with a
 * search field when it has many options. Follows the WAI-ARIA
 * combobox/listbox pattern: focus stays in the search field (or the list),
 * the active option is `aria-activedescendant`, ↑/↓ move, Enter picks,
 * Esc closes and returns focus to the button.
 *
 * A menu without a listbox is a PANEL (the BPM range): a button and a popup
 * dialog of its own controls. It shares the opening, closing, outside-press
 * and Esc handling; what's inside it reports its own changes.
 *
 * The markup comes from `renderMenu()` (server or client); this module
 * only adds behaviour.
 *
 * @module menus
 */
/**
 * Does an option's label match what's typed in a menu's search field?
 * Case- and accent-insensitive substring.
 *
 * @param label
 * @param query
 */
export declare function optionMatches(label: string, query: string): boolean;
/**
 * Move an index by `delta`, clamped to `0..length-1`.
 *
 * @param current - -1 when nothing is active.
 * @param delta
 * @param length
 */
export declare function stepIndex(current: number, delta: number, length: number): number;
/**
 * Every dropdown inside one list, with one shared "which is open" state.
 */
export declare class Menus {
    /** Each menu's root element, by its `data-ws-menu` name. */
    menus: Record<string, HTMLElement>;
    /** The open menu's root element, if any. */
    openMenu: HTMLElement | null;
    /**
     * @param {HTMLElement} container - The list's root element.
     * @param {Object} opts
     * @param {(name: string, value: string) => void} opts.onPick - A value was chosen.
     * @param {AbortSignal} opts.signal - Removes every listener on abort.
     */
    constructor(container: HTMLElement, { onPick, signal }: {
        onPick: (name: string, value: string) => void;
        signal: AbortSignal;
    });
    /**
     * Open a menu (closing any other), with the selected option active and
     * focus in its search field or list. Flips to open over the end edge
     * when it would overflow the list.
     *
     * @param menu
     */
    open(menu: HTMLElement): void;
    /**
     * Close the open menu, if any.
     *
     * @param focusButton - Return focus to its button (after a
     *   pick or Esc; not after a click elsewhere).
     */
    close(focusButton: boolean): void;
    /**
     * Show `value` as a menu's choice (button text + `aria-selected`). Used
     * after a pick and when the filter is changed from code.
     *
     * @param name - 'type' | 'key' | 'sort'.
     * @param value
     */
    setValue(name: string, value: string): void;
}
//# sourceMappingURL=menus.d.ts.map