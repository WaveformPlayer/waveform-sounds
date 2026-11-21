// @vitest-environment node
// The renderer must run with no DOM: wrappers call it on the server.
import {describe, it, expect} from 'vitest';
import {renderSounds, renderSoundsElement, toolbarPlan, idBase, loopsByDefault} from '../../../src/js/render/markup.js';
import {facets, normalizeSounds} from '../../../src/js/data/sounds.js';
import {resolveRenderOptions} from '../../../src/js/render/options.js';
import * as renderEntry from '../../../src/js/render-entry.js';
import {pickRenderOptions, RENDER_OPTION_KEYS} from '../../../src/js/render/options.js';
import {RENDER_CHUNK} from '../../../src/js/data/navigation.js';

/** The sounds' JSON in a list's markup. */
const dataOf = (html) => JSON.parse(html.match(/<script type="application\/json" data-ws-sounds>(.*?)<\/script>/s)[1]);
/** The rows a list's markup renders (their indexes, in order). */
const rowsIn = (html) => [...html.matchAll(/<li class="ws-row" data-ws-index="(\d+)"/g)].map((m) => m[1]);

const sounds = [
    {url: '/a.mp3', title: 'Bass <b>Loop</b>', type: 'Bass', bpm: 128, key: 'F minor', duration: 8, peaks: [0, 1]},
    {url: '/b.mp3', title: 'Kick', type: 'Drums', bpm: 140, key: 'C'},
];

describe('renderSounds (server)', () => {
    it('a fractional BPM pack gets whole-number slider ends (floor / ceil)', () => {
        const html = renderSounds([{url: '/a.mp3', bpm: 89.5}, {url: '/b.mp3', bpm: 128.5}]);
        expect(html).toContain('data-ws-bpm-min aria-label="Min BPM" min="89" max="129" step="1" value="89"');
        expect(html).toContain('data-ws-bpm-max aria-label="Max BPM" min="89" max="129" step="1" value="129"');
        expect(html).toContain('89–129 BPM');
        expect(html).toContain('<span>89</span><span>129</span>');
    });

    it('renders with no window or document', () => {
        expect(typeof window).toBe('undefined');
        expect(renderEntry.renderSounds(sounds)).toContain('data-ws-list');
    });

    it('escapes text and attributes, and nothing closes the JSON early', () => {
        const html = renderSounds([{url: '/x".mp3', title: '<script>alert(1)</script></script>', download: '/d".wav'}]);
        expect(html).not.toContain('<script>');
        expect(html).toContain('&lt;script&gt;');
        expect(html).toContain('href="/d&quot;.wav"');
        expect(html.match(/<\/script>/g)).toHaveLength(1);
        expect(dataOf(html)[0].title).toBe('<script>alert(1)</script></script>');
    });

    it('carries every sound as JSON the runtime reads back to the same sounds', () => {
        const input = [...sounds, {url: '/c.mp3', id: 'kick', tags: 'dark, wet', loop: 'true', download: '/c.wav', waveform: '/c.json', duration: '0:03'}, {url: '/d.mp3', title: 'Dup', id: 'kick'}];
        const html = renderSounds(input);
        expect(normalizeSounds(dataOf(html))).toEqual(normalizeSounds(input));
        // What normalising fills in is left out.
        expect(dataOf(html)[0]).toEqual({url: '/a.mp3', title: 'Bass <b>Loop</b>', type: 'Bass', bpm: 128, key: 'Fm', duration: 8, peaks: '00ff'});
        expect(html).toContain('data-ws-index="0"');
        expect(html).toContain('>0:08<');
    });

    it('offers only the controls the data can use', () => {
        const one = renderSounds([{url: '/a.mp3', type: 'Bass'}, {url: '/b.mp3', type: 'Bass'}]);
        expect(one).not.toContain('data-ws-type=');
        expect(one).not.toContain('data-ws-menu="key"');
        expect(one).not.toContain('data-ws-bpm-min');
        const full = renderSounds(sounds);
        expect(full).toContain('data-ws-type="Bass"');
        expect(full).toContain('data-ws-menu="key"');
        expect(full).toMatch(/role="option"[^>]*data-value="Fm"/);
        expect(full).toContain('data-ws-bpm-min');
    });

    it('turns many types into a menu instead of a wall of chips', () => {
        const many = Array.from({length: 12}, (_, i) => ({url: `/${i}.mp3`, type: `T${i}`}));
        const html = renderSounds(many);
        expect(html).toContain('data-ws-menu="type"');
        expect(html).not.toContain('class="ws-chip"');
        expect(renderSounds(many, {maxTypeChips: 20})).toContain('class="ws-chip"');
    });

    it('a long menu gets a search field; a short one does not', () => {
        const many = Array.from({length: 12}, (_, i) => ({url: `/${i}.mp3`, type: `T${i}`}));
        expect(renderSounds(many)).toMatch(/data-ws-menu="type"[\s\S]*data-ws-menu-search/);
        const html = renderSounds(sounds);
        expect(html).not.toContain('data-ws-menu-search'); // 3 keys, 5 sorts
        expect(renderSounds(many, {menuSearch: 50})).not.toContain('data-ws-menu-search');
    });

    it('every control can be removed', () => {
        const html = renderSounds(sounds, {search: false, filters: [], sorts: [], loopToggle: false, showCount: false, columns: []});
        for (const hook of ['data-ws-search', 'data-ws-type=', 'data-ws-menu=', 'data-ws-bpm-min', 'data-ws-loop', 'data-ws-count', 'ws-bpm"', 'ws-type"']) {
            expect(html).not.toContain(hook);
        }
    });

    it('removing BPM is filters + columns + sorts', () => {
        const html = renderSounds(sounds, {filters: ['type', 'key'], columns: ['type', 'key', 'duration'], sorts: ['default', 'title', 'key']});
        expect(html).not.toContain('data-ws-bpm-min');
        expect(html).not.toContain('class="ws-cell ws-bpm"');
        expect(html).not.toMatch(/data-value="bpm"/);
    });

    it('sorts sets the menu order and drops orders the data cannot use', () => {
        const html = renderSounds([{url: '/a.mp3', title: 'A'}, {url: '/b.mp3', title: 'B'}], {sorts: ['title', 'bpm', 'default']});
        expect([...html.matchAll(/data-ws-menu="sort"[\s\S]*?<\/ul>/g)][0][0].match(/data-value="(\w+)"/g)).toEqual(['data-value="title"', 'data-value="default"']);
    });

    it('a sound with a download link gets a download button; others get nothing', () => {
        const html = renderSounds([{url: '/a.mp3', title: 'Kick', download: '/free/kick.wav'}, {url: '/b.mp3', title: 'Snare'}]);
        expect(html).toContain('<a class="ws-download" href="/free/kick.wav" download aria-label="Download Kick">');
        expect(html.match(/class="ws-download"/g)).toHaveLength(1);
    });

    it('idPrefix makes two lists of the same sounds distinct', () => {
        expect(renderSounds(sounds, {idPrefix: 'a'})).toContain('id="a-key-list"');
        expect(renderSounds(sounds, {idPrefix: 'b'})).toContain('id="b-key-list"');
    });

    it('menu ids are stable across renders and unique per list', () => {
        expect(renderSounds(sounds)).toBe(renderSounds(sounds));
        const a = renderSounds(sounds).match(/id="(ws[^-"]+)-/)[1];
        const b = renderSounds([{url: '/z.mp3', key: 'C'}, {url: '/y.mp3', key: 'D'}]).match(/id="(ws[^-"]+)-/)[1];
        expect(a).not.toBe(b);
    });

    it('renders only the first page of rows (every sound is in the JSON), and "Show more" counts the rest', () => {
        const many = Array.from({length: 7}, (_, i) => ({url: `/${i}.mp3`}));
        const html = renderSounds(many, {pageSize: 5});
        expect(rowsIn(html)).toEqual(['0', '1', '2', '3', '4']);
        expect(html).not.toMatch(/<li [^>]*hidden/);
        expect(dataOf(html)).toHaveLength(7);
        expect(html).toContain('Show 2 more');
    });

    it('paging off renders the first chunk of rows; the runtime renders the rest as the list scrolls', () => {
        const many = Array.from({length: RENDER_CHUNK + 20}, (_, i) => ({url: `/${i}.mp3`}));
        const html = renderSounds(many, {pageSize: 0});
        expect(rowsIn(html)).toHaveLength(RENDER_CHUNK);
        expect(dataOf(html)).toHaveLength(RENDER_CHUNK + 20);
        expect(html).toContain('data-ws-more hidden');
    });

    it('renders the rows in the starting order (the first sort offered)', () => {
        const abc = [{url: '/1.mp3', title: 'C'}, {url: '/2.mp3', title: 'A'}, {url: '/3.mp3', title: 'B'}];
        expect(rowsIn(renderSounds(abc, {sorts: ['title', 'default'], pageSize: 2}))).toEqual(['1', '2']);
        expect(rowsIn(renderSounds(abc))).toEqual(['0', '1', '2']);
    });

    it('defines each icon once per list, in a sprite named by the id prefix; rows use it', () => {
        const html = renderSounds(sounds, {idPrefix: 'pk'});
        expect(html.startsWith('<svg class="ws-sprite" data-ws-sprite="pk" width="0" height="0" aria-hidden="true" focusable="false">')).toBe(true);
        expect(html.match(/<symbol /g)).toHaveLength(6); // play, pause, search, chevron, check, loop (the toggle)
        expect(html.match(/<path /g)).toHaveLength(6);
        expect(html).toContain('<symbol id="pk-i-play" viewBox="0 0 24 24">');
        expect(html).toContain('<svg class="ws-icon ws-icon-play" aria-hidden="true" focusable="false"><use href="#pk-i-play"/></svg>');
        expect(html.match(/href="#pk-i-pause"/g)).toHaveLength(2);
        // Only the icons the list uses.
        expect(renderSounds([{url: '/a.mp3'}], {search: false, filters: [], sorts: [], loopToggle: false})).not.toContain('i-check');
        expect(renderSounds([{url: '/a.mp3', download: '/a.wav'}])).toContain('id="ws');
        expect(renderSounds([{url: '/a.mp3', download: '/a.wav'}])).toMatch(/<symbol id="[^"]+-i-download"/);
    });

    it('a row reads as one sentence, which also describes its play button', () => {
        const html = renderSounds([{url: '/a.mp3', title: 'Pad', type: 'Keys', bpm: 130, key: 'B minor', duration: 7.4, loop: true}, {url: '/b.mp3', title: 'Plain'}], {idPrefix: 'pk'});
        const [row, plain] = html.split('<li class="ws-row"').slice(1);
        expect(row).toContain('aria-describedby="pk-d0"');
        expect(row).toContain('<span class="ws-cells" aria-hidden="true">');
        expect(row).toContain('<span class="ws-sr" id="pk-d0">Keys, 130 BPM, key B minor, 0:07, Loop</span>');
        expect(plain).not.toContain('aria-describedby');
        expect(plain).not.toMatch(/class="ws-sr" id=/);
        const nl = renderSounds([{url: '/a.mp3', bpm: 90, key: 'F#'}], {idPrefix: 'pk', columns: ['key', 'bpm'], strings: {rowBpm: '{bpm} slagen', rowKey: 'toonsoort {key}', keyMajor: '{note} groot', noteSharp: '{note}-kruis', listSeparator: '; '}});
        expect(nl).toContain('>toonsoort F-kruis groot; 90 slagen<');
    });

    it('no row waveform is a slider in the markup (the runtime makes the current one the slider)', () => {
        const html = renderSounds(sounds);
        expect(html).not.toContain('role="slider"');
        expect(html).toContain('<span class="ws-wave" aria-hidden="true"><canvas class="ws-canvas"></canvas></span>');
    });

    it('strip layout has no row waveforms and a visible engine slot', () => {
        const html = renderSounds(sounds, {player: 'strip'});
        expect(html).not.toContain('ws-wave');
        expect(html).toContain('ws-engine--strip');
        expect(renderSounds(sounds)).toMatch(/data-ws-engine hidden/);
    });

    it('honours columns and strings', () => {
        const html = renderSounds(sounds, {columns: ['bpm'], strings: {searchPlaceholder: 'Zoeken…'}});
        expect(html).not.toContain('ws-type"');
        expect(html).toContain('ws-bpm');
        expect(html).toContain('placeholder="Zoeken…"');
    });

    it('wraps in the auto-init element', () => {
        const html = renderSoundsElement(sounds, {player: 'strip'}, 'extra');
        expect(html.startsWith('<div class="waveform-sounds waveform-sounds--strip extra" data-waveform-sounds data-player="strip">')).toBe(true);
    });

    it('writes a data-* attribute for every render option set (the inner markup is renderSounds\')', () => {
        const opts = {pageSize: 20, filters: [], sorts: ['title', 'bogus'], search: false, loop: false, idPrefix: 'p1', strings: {all: 'Alles', count: undefined}, waveformColor: 'red', menuSearch: null};
        const html = renderSoundsElement(sounds, opts);
        const open = html.slice(0, html.indexOf('>') + 1);
        expect(open).toBe('<div class="waveform-sounds waveform-sounds--inline" data-waveform-sounds data-player="inline" data-search="false" data-filters="" data-sorts="title" data-page-size="20" data-id-prefix="p1" data-loop="false" data-strings="{&quot;all&quot;:&quot;Alles&quot;}">');
        expect(html.slice(open.length, -'</div>'.length)).toBe(renderSounds(sounds, opts));
    });

    it('carries mergeEnharmonicKeys: false to the runtime, and the key menu keeps every spelling', () => {
        const keyed = [{url: '/1', key: 'A#m'}, {url: '/2', key: 'Bbm'}, {url: '/3', key: 'C'}];
        const merged = renderSounds(keyed);
        // One of each: the tie goes to the conventional spelling.
        expect(merged).toContain('data-value="Bbm" data-alt="A#m"');
        expect(merged).not.toContain('data-value="A#m"');
        const html = renderSoundsElement(keyed, {mergeEnharmonicKeys: false});
        expect(html).toContain('data-merge-enharmonic-keys="false"');
        expect(html).toContain('data-value="A#m" aria-selected');
        expect(html).toContain('data-value="Bbm" aria-selected');
    });

});

describe('toolbarPlan', () => {
    const plan = (sounds, opts = {}) => toolbarPlan(facets(normalizeSounds(sounds)), resolveRenderOptions(opts));
    const many = Array.from({length: 4}, (_, i) => ({url: `/${i}.mp3`, type: `T${i}`, key: i % 2 ? 'C' : 'Fm', bpm: 120 + i, duration: 8}));
    it('shows a control only when the data gives it something to do', () => {
        expect(plan([{url: '/a.mp3'}, {url: '/b.mp3'}])).toMatchObject({types: null, key: false, bpm: false, sorts: ['default', 'title']});
        expect(plan(many)).toMatchObject({types: 'chips', key: true, bpm: true, sorts: ['default', 'title', 'bpm', 'key', 'duration']});
    });
    it('types become a menu past maxTypeChips; disabled controls stay off', () => {
        expect(plan(many, {maxTypeChips: 2}).types).toBe('menu');
        expect(plan(many, {filters: ['type'], sorts: ['title']})).toMatchObject({key: false, bpm: false, sorts: []});
    });
    it('offers loops or one-shots only for a list with both', () => {
        const mixed = [{url: '/a.mp3', loop: true}, {url: '/b.mp3'}];
        expect(plan(mixed).loops).toBe(true);
        expect(plan([{url: '/a.mp3', loop: true}, {url: '/b.mp3', loop: true}]).loops).toBe(false);
        expect(plan([{url: '/a.mp3'}, {url: '/b.mp3'}]).loops).toBe(false);
        expect(plan(mixed, {filters: ['type']}).loops).toBe(false);
    });
});

describe('loops in the markup', () => {
    // Server-side (no DOM here): string checks on the renderer's output.
    const html = renderSounds([{url: '/a.mp3', title: 'Drum Loop', loop: true}, {url: '/b.mp3', title: 'Kick'}]);
    const rowsOf = (markup) => markup.split('<li class="ws-row"').slice(1);

    it('renders the three-way filter, All pressed', () => {
        expect(html).toContain('<div class="ws-seg" role="group" aria-label="Loops or one-shots">');
        expect(html).toMatch(/data-ws-loop-filter="" aria-pressed="true"><span>All<\/span>/);
        expect(html).toMatch(/data-ws-loop-filter="loop" aria-pressed="false"><span>Loops<\/span>/);
        expect(html).toMatch(/data-ws-loop-filter="one-shot" aria-pressed="false"><span>One-shots<\/span>/);
    });

    it('marks a loop row (an icon, and "Loop" in its read-out); a one-shot carries nothing', () => {
        const [loop, shot] = rowsOf(html);
        expect(loop).toContain('<span class="ws-title-text">Drum Loop</span>');
        expect(loop).toMatch(/class="ws-loop-mark" title="Loop" aria-hidden="true"><svg/);
        expect(loop).toMatch(/<span class="ws-sr" id="[^"]+">Loop<\/span>/);
        expect(dataOf(html)[0].loop).toBe(true);
        expect(shot).not.toContain('ws-loop-mark');
        expect(dataOf(html)[1].loop).toBeUndefined();
    });

    it('no filter for a list without loops', () => {
        expect(renderSounds([{url: '/a.mp3'}, {url: '/b.mp3'}])).not.toContain('ws-seg');
    });
});

describe('idBase', () => {
    it('is stable for the same sounds and differs for others', () => {
        expect(idBase([{url: '/a.mp3'}])).toBe(idBase([{url: '/a.mp3'}]));
        expect(idBase([{url: '/a.mp3'}])).not.toBe(idBase([{url: '/b.mp3'}]));
        expect(idBase([{url: '/a.mp3'}])).toMatch(/^ws[0-9a-z]+$/);
    });
});

describe('the BPM menu', () => {
    const html = renderSounds([{url: '/a.mp3', bpm: 121}, {url: '/b.mp3', bpm: 128}, {url: '/c.mp3'}], {idPrefix: 'p'});
    it('is a button opening a dialog with two range handles across the pack\'s tempos', () => {
        expect(html).toContain('data-ws-menu="bpm"');
        expect(html).toContain('aria-haspopup="dialog"');
        expect(html).toMatch(/<span class="ws-menu-value" data-ws-menu-value>Any BPM<\/span>/);
        expect(html).toMatch(/<input type="range" class="ws-range-input" data-ws-bpm-min aria-label="Min BPM" min="121" max="128" step="1" value="121">/);
        expect(html).toMatch(/<input type="range" class="ws-range-input" data-ws-bpm-max aria-label="Max BPM" min="121" max="128" step="1" value="128">/);
        expect(html).toContain('id="p-bpm-pop" role="dialog"');
    });
    it('writes no style attribute (a strict CSP would block it)', () => {
        expect(html).not.toMatch(/ style="/);
    });
});

describe('the Loop toggle\'s starting state', () => {
    it('follows the data unless the loop option says otherwise', () => {
        expect(loopsByDefault(null, {loops: 2})).toBe(true);
        expect(loopsByDefault(undefined, {loops: 0})).toBe(false);
        expect(loopsByDefault(false, {loops: 2})).toBe(false);
        expect(loopsByDefault(true, {loops: 0})).toBe(true);
    });
    it('is rendered pressed for a list that marks loops', () => {
        expect(renderSounds([{url: '/a.mp3', loop: true}, {url: '/b.mp3'}])).toContain('data-ws-loop aria-pressed="true"');
        expect(renderSounds([{url: '/a.mp3'}, {url: '/b.mp3'}])).toContain('data-ws-loop aria-pressed="false"');
        expect(renderSounds([{url: '/a.mp3', loop: true}, {url: '/b.mp3'}], {loop: false})).toContain('data-ws-loop aria-pressed="false"');
    });
});

describe('pickRenderOptions', () => {
    it('keeps the render options that are set, nothing else', () => {
        expect(RENDER_OPTION_KEYS).toEqual(['player', 'search', 'filters', 'sorts', 'loopToggle', 'showCount', 'menuSearch', 'pageSize', 'columns', 'maxTypeChips', 'mergeEnharmonicKeys', 'idPrefix', 'loop', 'strings']);
        expect(pickRenderOptions({pageSize: 20, loop: null, onPlay: () => {}, waveformColor: 'red', strings: {all: 'A'}, player: undefined}))
            .toEqual({pageSize: 20, strings: {all: 'A'}});
        expect(pickRenderOptions(null)).toEqual({});
    });
    it('is exported from /render', () => {
        expect(renderEntry.pickRenderOptions).toBe(pickRenderOptions);
        expect(renderEntry.RENDER_OPTION_KEYS).toBe(RENDER_OPTION_KEYS);
    });
});
