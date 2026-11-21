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

import {fold} from '@arraypress/text';

/**
 * Does an option's label match what's typed in a menu's search field?
 * Case- and accent-insensitive substring.
 *
 * @param label
 * @param query
 * @returns 
 */
export function optionMatches(label: string, query: string): boolean {
    const q = fold(String(query ?? '')).trim();
    return !q || fold(String(label ?? '')).includes(q);
}

/**
 * Move an index by `delta`, clamped to `0..length-1`.
 *
 * @param current - -1 when nothing is active.
 * @param delta
 * @param length
 * @returns 
 */
export function stepIndex(current: number, delta: number, length: number): number {
    return Math.max(0, Math.min(length - 1, current + delta));
}

/** One dropdown's elements. A panel (the BPM range) has no list, search or none. */
interface MenuParts {
    button: HTMLElement;
    pop: HTMLElement;
    search: HTMLInputElement | null;
    list: HTMLElement | null;
    none: HTMLElement | null;
    value: HTMLElement | null;
}

/** The parts of one dropdown. */
function partsOf(menu: HTMLElement): MenuParts {
    return {
        button: menu.querySelector<HTMLElement>('[data-ws-menu-btn]')!,
        pop: menu.querySelector<HTMLElement>('[data-ws-menu-pop]')!,
        search: menu.querySelector<HTMLInputElement>('[data-ws-menu-search]'),
        list: menu.querySelector<HTMLElement>('[data-ws-menu-list]'),
        none: menu.querySelector<HTMLElement>('[data-ws-menu-none]'),
        value: menu.querySelector<HTMLElement>('[data-ws-menu-value]'),
    };
}

/** The element that owns focus while a menu is open (a panel: its first field, else its first button). */
const focusOwner = (p: MenuParts): HTMLElement | null => p.search || p.list || p.pop.querySelector('input') || p.pop.querySelector('button');

/** A menu's options, optionally only the ones not filtered out. */
const optionsOf = (p: MenuParts, visibleOnly = false): HTMLElement[] => [...p.list!.querySelectorAll<HTMLElement>('[role="option"]')].filter((o) => !visibleOnly || !o.hidden);

/**
 * Every dropdown inside one list, with one shared "which is open" state.
 */
export class Menus {
    /** @internal */ declare container: HTMLElement;
    /** @internal */ declare onPick: (name: string, value: string) => void;
    /** Each menu's root element, by its `data-ws-menu` name. */
    declare menus: Record<string, HTMLElement>;
    /** The open menu's root element, if any. */
    declare openMenu: HTMLElement | null;

    /**
     * @param {HTMLElement} container - The list's root element.
     * @param {Object} opts
     * @param {(name: string, value: string) => void} opts.onPick - A value was chosen.
     * @param {AbortSignal} opts.signal - Removes every listener on abort.
     */
    constructor(container: HTMLElement, {onPick, signal}: {onPick: (name: string, value: string) => void, signal: AbortSignal}) {
        this.container = container;
        this.onPick = onPick;
        /** @type {Record<string, HTMLElement>} */
        this.menus = Object.fromEntries([...container.querySelectorAll<HTMLElement>('[data-ws-menu]')].map((m) => [m.dataset.wsMenu!, m]));
        /** @type {HTMLElement|null} */
        this.openMenu = null;
        this._bind(signal);
    }

    /**
     * Wire every menu, plus closing on an outside press or focus leaving.
     * @param signal
     * @internal
     */
    _bind(signal: AbortSignal) {
        const sig = {signal};
        for (const [name, menu] of Object.entries(this.menus)) {
            const p = partsOf(menu);
            p.button.addEventListener('click', () => (this.openMenu === menu ? this.close(true) : this.open(menu)), sig);
            p.button.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); this.open(menu); }
            }, sig);
            if (!p.list) {
                // A panel: Esc anywhere inside it closes it.
                p.pop.addEventListener('keydown', (e) => {
                    if (e.key !== 'Escape') return;
                    e.preventDefault();
                    e.stopPropagation();
                    this.close(true);
                }, sig);
                continue;
            }
            p.list.addEventListener('click', (e) => {
                const opt = (e.target as Element).closest<HTMLElement>('[role="option"]');
                if (opt) this._pick(name, opt.dataset.value!);
            }, sig);
            // Keep focus in the field while an option is pressed.
            p.list.addEventListener('mousedown', (e) => e.preventDefault(), sig);
            p.search?.addEventListener('input', () => this._filter(menu, p.search!.value), sig);
            focusOwner(p)!.addEventListener('keydown', (e: KeyboardEvent) => this._onKey(e, name, menu), sig);
        }
        document.addEventListener('pointerdown', (e) => {
            if (this.openMenu && !this.openMenu.contains(e.target as Node)) this.close(false);
        }, sig);
        this.container.addEventListener('focusout', (e) => {
            if (this.openMenu && !this.openMenu.contains(e.relatedTarget as Node | null)) this.close(false);
        }, sig);
    }

    /**
     * Open a menu (closing any other), with the selected option active and
     * focus in its search field or list. Flips to open over the end edge
     * when it would overflow the list.
     *
     * @param menu
     */
    open(menu: HTMLElement) {
        if (this.openMenu && this.openMenu !== menu) this.close(false);
        const p = partsOf(menu);
        p.button.setAttribute('aria-expanded', 'true');
        p.pop.hidden = false;
        this.openMenu = menu;
        if (p.search) { p.search.value = ''; this._filter(menu, ''); }
        menu.classList.remove('ws-menu--end');
        if (p.pop.getBoundingClientRect().right > this.container.getBoundingClientRect().right + 1) menu.classList.add('ws-menu--end');
        if (p.list) this._activate(menu, p.list.querySelector<HTMLElement>('[role="option"][aria-selected="true"]'));
        focusOwner(p)?.focus();
    }

    /**
     * Close the open menu, if any.
     *
     * @param focusButton - Return focus to its button (after a
     *   pick or Esc; not after a click elsewhere).
     */
    close(focusButton: boolean) {
        const menu = this.openMenu;
        if (!menu) return;
        this.openMenu = null;
        const p = partsOf(menu);
        p.pop.hidden = true;
        p.button.setAttribute('aria-expanded', 'false');
        if (focusButton) p.button.focus();
    }

    /**
     * Show `value` as a menu's choice (button text + `aria-selected`). Used
     * after a pick and when the filter is changed from code.
     *
     * @param name - 'type' | 'key' | 'sort'.
     * @param value
     */
    setValue(name: string, value: string) {
        const menu = this.menus[name];
        if (!menu) return;
        const p = partsOf(menu);
        if (!p.list) return; // a panel shows its own value
        let label: string | null = null;
        for (const opt of optionsOf(p)) {
            const on = opt.dataset.value === String(value ?? '');
            opt.setAttribute('aria-selected', String(on));
            if (on) label = opt.querySelector('.ws-menu-text')?.textContent ?? '';
        }
        if (label !== null) p.value!.textContent = label;
    }

    /**
     * Narrow a menu to the options matching the search, and make the first
     * match active.
     * @internal
     */
    _filter(menu: HTMLElement, query: string): void {
        const p = partsOf(menu);
        let first: HTMLElement | null = null;
        for (const opt of optionsOf(p)) {
            opt.hidden = !optionMatches(opt.textContent, query);
            if (!opt.hidden) first ??= opt;
        }
        p.none!.hidden = first !== null;
        this._activate(menu, first);
    }

    /**
     * Mark one option active (`aria-activedescendant`) and scroll it into
     * the list's view.
     * @internal
     */
    _activate(menu: HTMLElement, opt: HTMLElement | null | undefined): void {
        const p = partsOf(menu);
        for (const o of p.list!.querySelectorAll('.is-active')) o.classList.remove('is-active');
        const owner = focusOwner(p)!;
        if (!opt || opt.hidden) { owner.removeAttribute('aria-activedescendant'); return; }
        opt.classList.add('is-active');
        owner.setAttribute('aria-activedescendant', opt.id);
        opt.scrollIntoView?.({block: 'nearest'});
    }

    /**
     * Keys inside an open menu.
     * @internal
     */
    _onKey(e: KeyboardEvent, name: string, menu: HTMLElement): void {
        const p = partsOf(menu);
        const opts = optionsOf(p, true);
        const at = opts.indexOf(p.list!.querySelector<HTMLElement>('.is-active')!);
        const moveTo = (i: number) => { e.preventDefault(); this._activate(menu, opts[i]); };
        const inField = (e.target as Element).matches('input');
        switch (e.key) {
            case 'ArrowDown': return moveTo(stepIndex(at, 1, opts.length));
            case 'ArrowUp': return moveTo(stepIndex(at, -1, opts.length));
            case 'Home': return inField ? undefined : moveTo(0);
            case 'End': return inField ? undefined : moveTo(opts.length - 1);
            case 'Enter':
                e.preventDefault();
                if (at >= 0) this._pick(name, opts[at].dataset.value!);
                return undefined;
            case 'Escape':
                e.preventDefault();
                e.stopPropagation();
                return this.close(true);
            case 'Tab': return this.close(false);
            default: return undefined;
        }
    }

    /**
     * A value was chosen: close, then report it.
     * @internal
     */
    _pick(name: string, value: string): void {
        this.close(true);
        this.onPick(name, value);
    }
}
