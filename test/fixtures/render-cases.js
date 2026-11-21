// The inputs of the server-markup byte-identity test (test/unit/render/golden.test.js).
// `render-2.0.0.json` holds what the PUBLISHED 2.0.0 `/render` made of each:
// server-rendered markup is a contract with every page that already carries
// it, so a change that alters the output for one of these inputs is a
// breaking change unless it is meant to be (and the fixture is regenerated
// from the release that made it).

/** A deterministic PRNG (LCG), so the big pack is the same on every run. */
function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const TYPES = [['Drum loops', true], ['Bass loops', true], ['Kicks', false], ['Snares', false], ['FX', false], ['Keys', false], ['Vocal loops', true]];
const KEYS = ['C', 'Cm', 'C#', 'Dm', 'Eb', 'E', 'Fm', 'F#', 'G', 'Ab', 'A', 'Bbm', 'B'];
const TAGS = ['dark', 'bright', 'wet', 'dry', 'house', 'techno', 'lofi'];
const BPMS = [85, 90, 100, 120, 124, 128, 140, 174];

/**
 * A realistic pack: integer BPMs (as 2.0.0 rendered them), hex peaks, loops,
 * keys, tags and some downloads.
 */
export function pack(n, seed = 7) {
    const r = rng(seed);
    const sounds = [];
    for (let i = 0; i < n; i++) {
        const [type, loop] = TYPES[Math.floor(r() * TYPES.length)];
        const s = {url: `/audio/s${i}.mp3?n=${i}`, title: `NW ${type} ${String(i + 1).padStart(3, '0')}`, type};
        if (loop) s.bpm = BPMS[Math.floor(r() * BPMS.length)];
        if (/Bass|Keys|Vocal/.test(type)) s.key = KEYS[Math.floor(r() * KEYS.length)];
        s.duration = loop ? 8 : +(0.15 + r() * 2.5).toFixed(2);
        if (loop) s.loop = true;
        if (r() < 0.5) s.tags = [TAGS[Math.floor(r() * TAGS.length)]];
        s.peaks = Array.from({length: 48}, () => Math.round(r() * 255).toString(16).padStart(2, '0')).join('');
        if (r() < 0.2) s.download = `/free/${i}.wav`;
        sounds.push(s);
    }
    return sounds;
}

/** 300 sounds: compared by hash. */
export const bigPack = () => pack(300, 11);

const small = pack(12, 3);
const plain = [
    {url: '/s/bass-01.mp3', title: 'Bass Loop 01', type: 'Bass', bpm: 128, key: 'Fm', duration: 8, peaks: '204060'},
    {url: '/s/drum-01.mp3', title: 'Drum Loop 01', type: 'Drums', bpm: 140, duration: 4},
    {url: '/s/bass-02.mp3', title: 'Bass <b>02</b>', type: 'Bass', bpm: 124, key: 'C', duration: 16},
    {url: '/s/crash.mp3', title: 'Crash', type: 'One-shots', download: '/free/crash.wav'},
];

/** [name, 'sounds' | 'element', sounds, options, className]. */
export const CASES = [
    ['plain defaults', 'sounds', plain, {}],
    ['pack defaults', 'sounds', small, {}],
    ['pack strip, paged', 'sounds', small, {player: 'strip', pageSize: 4}],
    ['type menu, searchable', 'sounds', small, {maxTypeChips: 2, menuSearch: 1}],
    ['no controls', 'sounds', small, {filters: [], sorts: [], search: false, showCount: false, loopToggle: false}],
    ['columns + sorts subset', 'sounds', small, {columns: ['key', 'duration'], sorts: ['title', 'bpm'], filters: ['bpm', 'loop']}],
    ['strings + idPrefix + loop off', 'sounds', small, {strings: {count: '{count} geluiden', play: 'Speel {title}', all: 'Alles'}, idPrefix: 'pk', loop: false}],
    ['paging off', 'sounds', small, {pageSize: 0}],
    ['empty', 'sounds', [], {}],
    ['element, no options', 'element', small, undefined, undefined],
    ['element, strip + class', 'element', plain, {player: 'strip'}, 'my-list'],
];
