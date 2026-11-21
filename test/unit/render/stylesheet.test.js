// @vitest-environment node
// The stylesheet and the markup must agree: every class and data-* attribute
// a selector names is one the package emits — from the server renderer, or
// toggled by the runtime (`classList` calls in core/ and dom/). A selector
// that matches nothing is dead CSS, or a class the markup renamed.
import {describe, it, expect} from 'vitest';
import {readFileSync, readdirSync} from 'node:fs';
import {renderSoundsElement} from '../../../src/js/render/markup.js';

const root = new URL('../../../', import.meta.url);
const css = readFileSync(new URL('src/css/waveform-sounds.css', root), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
// Selector text only: drop every declaration block's contents.
const selectors = css.replace(/\{[^{}]*\}/g, '{}');

const sounds = [
    {url: '/a.mp3', title: 'Bass Loop', type: 'Bass', bpm: 128, key: 'Fm', duration: 8, loop: true, download: '/a.wav'},
    {url: '/b.mp3', title: 'Kick', type: 'Drums', bpm: 140, key: 'C', duration: 1},
    {url: '/c.mp3', title: 'Riser', type: 'FX', duration: 4},
];
const markup = [
    renderSoundsElement(sounds, {menuSearch: 1, pageSize: 1}),
    renderSoundsElement(sounds, {maxTypeChips: 1}),
    renderSoundsElement(sounds, {player: 'strip'}),
].join('');

const runtimeSource = ['core', 'dom'].flatMap((dir) =>
    readdirSync(new URL(`src/js/${dir}/`, root)).map((f) => readFileSync(new URL(`src/js/${dir}/${f}`, root), 'utf8'))).join('\n');

describe('stylesheet', () => {
    it('names only classes the markup or the runtime uses', () => {
        const emitted = new Set([...markup.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)));
        const toggled = new Set([...runtimeSource.matchAll(/classList\.(?:add|remove|toggle)\(([^)]*)\)/g)]
            .flatMap((m) => [...m[1].matchAll(/'([\w-]+)'/g)].map((q) => q[1])));
        const used = [...new Set([...selectors.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]))];
        expect(used.length).toBeGreaterThan(40);
        expect(used.filter((c) => !emitted.has(c) && !toggled.has(c))).toEqual([]);
    });

    it('names only data-* attributes the markup writes or the runtime sets', () => {
        const set = new Set([...runtimeSource.matchAll(/dataset\.(\w+)\s*=[^=]/g)].map((m) => `data-${m[1].replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`));
        const used = [...new Set([...selectors.matchAll(/\[(data-[\w-]+)/g)].map((m) => m[1]))];
        expect(used.filter((a) => !set.has(a) && !new RegExp(`\\s${a}[\\s=>]`).test(markup))).toEqual([]);
    });
});
