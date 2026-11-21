import {describe, it, expect, beforeAll, afterEach, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {settle, MockWaveformPlayer} from '../setup.js';
import {WaveformSounds} from '../../src/js/entry.js';
import {WaveformSoundsElement, defineWaveformSoundsElement, ELEMENT_OPTION_KEYS} from '../../src/js/core/element.js';
import {renderSounds} from '../../src/js/render/markup.js';

/**
 * The `<waveform-sounds>` custom element: light DOM, the element is the
 * container, configured by every data-* option with or without the prefix,
 * and server-rendered markup inside it is adopted as `[data-waveform-sounds]`
 * markup is.
 */

const SOUNDS = [
    {url: '/s/bass-01.mp3', title: 'Bass Loop 01', type: 'Bass', bpm: 128, key: 'Fm', duration: 8},
    {url: '/s/drum-01.mp3', title: 'Drum Loop 01', type: 'Drums', bpm: 140, duration: 4},
    {url: '/s/bass-02.mp3', title: 'Bass Loop 02', type: 'Bass', bpm: 124, key: 'C', duration: 16},
    {url: '/s/crash.mp3', title: 'Crash', type: 'One-shots'},
];
const tick = () => new Promise((r) => setTimeout(r, 0));

beforeAll(() => {
    // Registered here directly; the entries' own registration is covered
    // below, against fresh module copies.
    defineWaveformSoundsElement();
});

afterEach(() => {
    document.body.innerHTML = '';
    WaveformSounds.instances.forEach((i) => i.destroy());
    MockWaveformPlayer.instances = [];
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete document.documentElement.dataset.waveformAutoinit;
});

/** Parse markup into the document, as a server-rendered page arrives. */
function page(html) {
    document.body.innerHTML = html;
    return document.body.firstElementChild;
}

const stubManifest = (sounds = SOUNDS) => {
    const fetch = vi.fn(async () => ({ok: true, json: async () => ({sounds})}));
    vi.stubGlobal('fetch', fetch);
    return fetch;
};
const visibleRows = (el) => [...el.querySelectorAll('[data-ws-index]')].filter((r) => !r.hidden);

describe('attributes', () => {
    it('accepts exactly the data-* keys readDataOptions reads, in both forms (drift guard)', () => {
        const src = readFileSync(resolve(process.cwd(), 'src/js/core/options.ts'), 'utf8');
        const body = src.slice(src.indexOf('export function readDataOptions'));
        const fn = body.slice(0, body.indexOf('\n}\n'));
        const keys = new Set([...fn.matchAll(/\bd\.([a-zA-Z]+)/g)].map((m) => m[1]));
        expect([...keys].sort()).toEqual([...ELEMENT_OPTION_KEYS].sort());
        const kebab = (k) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
        expect([...WaveformSoundsElement.observedAttributes].sort())
            .toEqual([...keys].flatMap((k) => [kebab(k), `data-${kebab(k)}`]).sort());
    });

    it('builds from plain and data- attributes; the plain one wins; a bare boolean is true', async () => {
        stubManifest();
        const el = page('<waveform-sounds manifest="/s.json" page-size="2" data-page-size="3" data-filters="type" auto-advance></waveform-sounds>');
        expect(el).toBeInstanceOf(WaveformSoundsElement);
        expect(el.sounds).toBeInstanceOf(WaveformSounds);
        await el.sounds.ready;
        expect(el.sounds.options).toMatchObject({manifest: '/s.json', pageSize: 2, filters: ['type'], autoAdvance: true});
        expect(visibleRows(el)).toHaveLength(2);
        expect(el.querySelector('[data-ws-menu="key"]')).toBeNull();
    });

    it('typed by tag name', () => {
        const el = document.createElement('waveform-sounds');
        expect(el).toBeInstanceOf(WaveformSoundsElement);
    });
});

describe('server-rendered markup', () => {
    it('adopts a renderSounds() child exactly as [data-waveform-sounds] markup', async () => {
        const inner = renderSounds(SOUNDS, {pageSize: 2});
        const el = page(`<waveform-sounds page-size="2">${inner}</waveform-sounds>`);
        const firstRow = el.querySelector('[data-ws-index]');
        await el.sounds.ready;
        expect(el.querySelector('[data-ws-index]')).toBe(firstRow); // adopted, not re-rendered
        expect(el.sounds.sounds.map((s) => s.title)).toEqual(SOUNDS.map((s) => s.title));
        expect(visibleRows(el)).toHaveLength(2);
        expect(MockWaveformPlayer.instances).toHaveLength(1);
    });

    it('events bubble from the element', async () => {
        const el = page(`<waveform-sounds>${renderSounds(SOUNDS)}</waveform-sounds>`);
        await el.sounds.ready;
        const seen = [];
        el.addEventListener('waveformsounds:play', (e) => seen.push(e.detail.index));
        el.sounds.play(1);
        await settle();
        expect(seen).toEqual([1]);
    });

    it('destroy({restore: true}) puts the server markup back byte for byte; destroy() leaves it as it is', async () => {
        const inner = renderSounds(SOUNDS, {pageSize: 2});
        const host = page(`<div data-waveform-sounds data-page-size="2">${inner}</div>`);
        const sent = host.innerHTML;
        let ws = new WaveformSounds(host);
        await ws.ready;
        ws.setSort('title');
        ws.play(2);
        await settle();
        ws.destroy();
        expect(host.innerHTML).not.toBe(sent);
        host.innerHTML = sent;
        ws = new WaveformSounds(host);
        await ws.ready;
        ws.setSort('title');
        ws.play(2);
        await settle();
        ws.destroy({restore: true});
        expect(host.innerHTML).toBe(sent);
        expect(host.className).toBe('');
        expect(host.dataset.wsInitialized).toBeUndefined();
    });
});

describe('lifecycle', () => {
    it('a move in the same task keeps the list (and its playback); a removal destroys it', async () => {
        const el = page(`<waveform-sounds>${renderSounds(SOUNDS)}</waveform-sounds>`);
        await el.sounds.ready;
        const ws = el.sounds;
        ws.play(0);
        await settle();
        const other = document.createElement('section');
        document.body.appendChild(other);
        other.appendChild(el); // disconnect + connect
        await tick();
        expect(el.sounds).toBe(ws);
        expect(ws.destroyed).toBe(false);
        expect(ws.playing).toBe(true);
        el.remove();
        await tick();
        expect(ws.destroyed).toBe(true);
        expect(el.sounds).toBeNull();
        // Removed and put back later: a fresh list over the markup as the server sent it.
        document.body.appendChild(el);
        expect(el.sounds).toBeInstanceOf(WaveformSounds);
        await el.sounds.ready;
        expect(el.querySelector('.is-current')).toBeNull();
    });

    it('attribute changes rebuild once per task, from the sounds it holds', async () => {
        const el = page(`<waveform-sounds>${renderSounds(SOUNDS)}</waveform-sounds>`);
        await el.sounds.ready;
        const first = el.sounds;
        const fetch = stubManifest();
        el.setAttribute('page-size', '1');
        el.setAttribute('data-filters', 'bpm');
        el.setAttribute('show-count', 'false');
        await Promise.resolve();
        expect(first.destroyed).toBe(true);
        const second = el.sounds;
        await second.ready;
        expect(WaveformSounds.instances.size).toBe(1);
        expect(second.options).toMatchObject({pageSize: 1, filters: ['bpm'], showCount: false});
        expect(visibleRows(el)).toHaveLength(1);
        expect(el.querySelector('[data-ws-type]')).toBeNull(); // re-rendered for the new filters
        expect(el.querySelector('[data-ws-count]')).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('a manifest change fetches the new one', async () => {
        const fetch = stubManifest();
        const el = page('<waveform-sounds manifest="/a.json"></waveform-sounds>');
        await el.sounds.ready;
        stubManifest(SOUNDS.slice(0, 1));
        el.setAttribute('manifest', '/b.json');
        el.setAttribute('page-size', '5');
        await Promise.resolve();
        await el.sounds.ready;
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(el.sounds.sounds).toHaveLength(1);
    });

    it('the [data-waveform-sounds] scan does not double-initialise <waveform-sounds data-waveform-sounds>', async () => {
        const el = page(`<waveform-sounds data-waveform-sounds>${renderSounds(SOUNDS)}</waveform-sounds>`);
        expect(WaveformSounds.init()).toHaveLength(0);
        await el.sounds.ready;
        expect(WaveformSounds.instances.size).toBe(1);
        expect(MockWaveformPlayer.instances).toHaveLength(1);
    });

    it('a list a scan built first (before the tag was defined) gives way to the element\'s own', async () => {
        const el = page(`<waveform-sounds-late data-waveform-sounds>${renderSounds(SOUNDS)}</waveform-sounds-late>`);
        const [scanned] = WaveformSounds.init();
        await scanned.ready;
        scanned.setSort('title');
        customElements.define('waveform-sounds-late', class extends WaveformSoundsElement {});
        expect(scanned.destroyed).toBe(true);
        expect(el.sounds).toBeInstanceOf(WaveformSounds);
        expect(el.sounds).not.toBe(scanned);
        expect(WaveformSounds.getInstance(el)).toBe(el.sounds);
        expect(WaveformSounds.instances.size).toBe(1);
        await el.sounds.ready;
        expect(el.sounds.sounds).toHaveLength(4);
    });
});

describe('registration', () => {
    const fresh = async (specifier) => {
        vi.resetModules();
        return import(specifier);
    };

    it('/no-autoinit does not register, but exports the definer (and the class has it as a static)', async () => {
        const define = vi.spyOn(customElements, 'define');
        const mod = await fresh('../../src/js/entry.js');
        expect(define).not.toHaveBeenCalled();
        expect(mod.defineWaveformSoundsElement).toBeTypeOf('function');
        expect(mod.WaveformSounds.defineElement).toBe(mod.defineWaveformSoundsElement);
    });

    it('the default entry does not register when the page opts out of auto-init', async () => {
        document.documentElement.dataset.waveformAutoinit = 'false';
        const define = vi.spyOn(customElements, 'define');
        await fresh('../../src/js/index.js');
        expect(define).not.toHaveBeenCalled();
    });

    it('an opted-out CDN page can register the tag through WaveformSounds.defineElement()', async () => {
        document.documentElement.dataset.waveformAutoinit = 'false';
        const define = vi.spyOn(customElements, 'define');
        await fresh('../../src/js/index.js');
        expect(define).not.toHaveBeenCalled();
        window.WaveformSounds.defineElement('waveform-sounds-optout');
        expect(define).toHaveBeenCalledWith('waveform-sounds-optout', expect.any(Function));
        const el = page(`<waveform-sounds-optout>${renderSounds(SOUNDS)}</waveform-sounds-optout>`);
        expect(el.sounds).toBeTruthy();
    });

    it('the default entry registers <waveform-sounds> (an existing definition is left alone)', async () => {
        const define = vi.spyOn(customElements, 'define');
        const mod = await fresh('../../src/js/index.js');
        // Already defined by this file's beforeAll: left alone, and the definer returns it.
        expect(define).not.toHaveBeenCalled();
        expect(mod.defineWaveformSoundsElement()).toBe(customElements.get('waveform-sounds'));
        mod.defineWaveformSoundsElement('waveform-sounds-fresh');
        expect(define).toHaveBeenCalledWith('waveform-sounds-fresh', expect.any(Function));
    });
});
