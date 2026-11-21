import {describe, it, expect, vi} from 'vitest';
import {readRows, readSoundsData, indexRows, visibleRows, layoutRows} from '../../../src/js/dom/rows.js';
import {renderSounds} from '../../../src/js/render/markup.js';
import {normalizeSounds} from '../../../src/js/data/sounds.js';
import golden200 from '../../fixtures/render-2.0.0.json';

const SOUNDS = [{url: '/a.mp3', title: 'A', bpm: 120, download: '/a.wav'}, {url: '/b.mp3', title: 'B'}, {url: '/c.mp3', title: 'C', loop: true}];

/** A container holding server markup. */
function rootOf(html) {
    const root = document.createElement('div');
    root.innerHTML = html;
    return root;
}
const titles = (list) => [...list.children].map((r) => r.querySelector('.ws-title-text').textContent);

describe('reading server markup back', () => {
    it('readSoundsData reads every sound from the JSON (2.2+)', () => {
        const root = rootOf(renderSounds(SOUNDS, {pageSize: 1}));
        expect(root.querySelectorAll('[data-ws-index]')).toHaveLength(1);
        expect(readSoundsData(root)).toEqual(normalizeSounds(SOUNDS));
    });

    it('readSoundsData: none, or unreadable, is null (then the rows are read)', () => {
        expect(readSoundsData(rootOf('<ul data-ws-list></ul>'))).toBeNull();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(readSoundsData(rootOf('<script type="application/json" data-ws-sounds>[{"url":</script>'))).toBeNull();
        expect(readSoundsData(rootOf('<script type="application/json" data-ws-sounds>{"url":"/a"}</script>'))).toBeNull();
        expect(warn).toHaveBeenCalledTimes(2);
        warn.mockRestore();
    });

    // Markup from before 2.2 (the published 2.0.0's): every row carries its sound.
    const legacy = () => rootOf(golden200.cases[0].html).querySelector('[data-ws-list]');

    it('readRows rebuilds the sounds from rows that carry them (markup before 2.2)', () => {
        const sounds = readRows(legacy());
        expect(sounds.map((s) => s.title)).toEqual(['Bass Loop 01', 'Drum Loop 01', 'Bass <b>02</b>', 'Crash']);
        expect(sounds[0]).toMatchObject({bpm: 128, key: 'Fm', duration: 8});
        expect(sounds[3]).toMatchObject({download: '/free/crash.wav'});
    });

    it('readRows renumbers around a missing or unusable row', () => {
        const list = legacy();
        list.querySelector('[data-ws-index="0"]').removeAttribute('data-url');
        const sounds = readRows(list);
        expect(sounds.map((s) => s.title)).toEqual(['Drum Loop 01', 'Bass <b>02</b>', 'Crash']);
        expect([...list.children].map((r) => r.dataset.wsIndex)).toEqual(['0', '1', '2']);
    });
});

describe('rows in the list', () => {
    const listOf = () => rootOf(renderSounds(SOUNDS, {pageSize: 0})).querySelector('[data-ws-list]');

    it('indexRows maps by sound index whatever the display order', () => {
        const list = listOf();
        const rows = indexRows(list);
        list.prepend(rows[2]);
        expect(indexRows(list)[2]).toBe(rows[2]);
        expect(visibleRows(list).map((r) => r.dataset.wsIndex)).toEqual(['2', '0', '1']);
    });

    it('layoutRows makes the list hold exactly the rows given, in order', () => {
        const list = listOf();
        const [a, b, c] = indexRows(list);
        layoutRows(list, [c, a]);
        expect(titles(list)).toEqual(['C', 'A']);
        expect(b.isConnected).toBe(false);
        layoutRows(list, [a, b, c]);
        expect(titles(list)).toEqual(['A', 'B', 'C']);
        layoutRows(list, []);
        expect(list.children).toHaveLength(0);
    });

    it('layoutRows leaves rows that are already in order where they are (focus stays)', () => {
        const list = listOf();
        document.body.appendChild(list);
        const [a, b, c] = indexRows(list);
        c.querySelector('.ws-play').focus();
        layoutRows(list, [a, c]); // a filter hid B
        layoutRows(list, [a, b, c]); // ...and cleared
        expect(document.activeElement).toBe(c.querySelector('.ws-play'));
        list.remove();
    });
});
