// @vitest-environment node
import {describe, it, expect} from 'vitest';
import {parseKey, keyClass, sameKey, keyRank, enharmonics, canonicalSpelling, keyEntries, keyEntry} from '../../../src/js/data/keys.js';
import {facets, matches, normalizeSounds, sortSounds} from '../../../src/js/data/sounds.js';

describe('key classes', () => {
    it('parses keys and leaves labels alone', () => {
        expect(parseKey('A#m')).toEqual({root: 'A#', pitch: 10, minor: true});
        expect(parseKey('Various')).toBeNull();
        expect(keyClass('A#m')).toBe(keyClass('Bbm'));
        expect(keyClass('Cb')).toBe(keyClass('B'));
        expect(keyClass('C#')).not.toBe(keyClass('C#m'));
        expect(keyClass('Various')).toBe('Various');
    });
    it('sameKey: the spelling always, enharmonics when merging', () => {
        expect(sameKey('Bbm', 'A#m')).toBe(true);
        expect(sameKey('Bbm', 'A#m', false)).toBe(false);
        expect(sameKey('Bbm', 'Bbm', false)).toBe(true);
        expect(sameKey('', 'C')).toBe(false);
    });
    it('ranks by pitch, majors first; labels after keys, none last', () => {
        expect(keyRank('Db')).toBe(keyRank('C#'));
        expect(keyRank('C') < keyRank('Cm')).toBe(true);
        expect(keyRank('Various')).toBe(1000);
        expect(keyRank('')).toBe(Infinity);
    });
    it('enharmonics lists the sharp and flat spelling', () => {
        expect(enharmonics('A#m')).toEqual(['A#m', 'Bbm']);
        expect(enharmonics('C')).toEqual(['C']);
        expect(enharmonics('Cb')).toEqual(['Cb', 'B']);
        expect(enharmonics('')).toEqual([]);
    });
});

describe('the spelling a merged entry shows', () => {
    const spell = (o) => canonicalSpelling(new Map(Object.entries(o)));
    it('is the one the pack uses most', () => {
        expect(spell({'A#m': 3, Bbm: 1})).toBe('A#m');
        expect(spell({'C#': 1, Db: 4})).toBe('Db');
    });
    it.each([
        [{'A#m': 1, Bbm: 1}, 'Bbm'], [{'C#m': 2, Dbm: 2}, 'C#m'], [{'D#m': 1, Ebm: 1}, 'Ebm'], [{'G#m': 1, Abm: 1}, 'G#m'],
        [{'C#': 1, Db: 1}, 'Db'], [{'F#': 1, Gb: 1}, 'F#'], [{'G#': 1, Ab: 1}, 'Ab'], [{'A#': 1, Bb: 1}, 'Bb'], [{B: 1, Cb: 1}, 'B'],
    ])('a tie goes to the conventional spelling: %j → %s', (o, out) => expect(spell(o)).toBe(out));
    it('a tie with no conventional spelling goes alphabetically', () => {
        expect(spell({'E#': 1, 'E#x': 1})).toBe('E#');
    });
});

describe('keyEntries / keyEntry', () => {
    it('merges spellings into one entry, in musical order, with aliases', () => {
        expect(keyEntries(['Bbm', 'A#m', 'C', 'A#m', '', 'Db', 'C#'])).toEqual({keys: ['C', 'Db', 'A#m'], aliases: {'A#m': ['Bbm'], Db: ['C#']}});
        expect(keyEntries(['Bbm', 'A#m', 'C'], false)).toEqual({keys: ['C', 'A#m', 'Bbm'], aliases: {}});
    });
    it('finds the entry for either spelling', () => {
        expect(keyEntry('Bbm', ['C', 'A#m'])).toBe('A#m');
        expect(keyEntry('Bbm', ['C', 'A#m'], false)).toBe('');
        expect(keyEntry('C', ['C'])).toBe('C');
        expect(keyEntry('D', ['C'])).toBe('');
        expect(keyEntry('', ['C'])).toBe('');
    });
});

describe('merged keys in facets, matches and sorting', () => {
    const list = normalizeSounds([
        {url: '/1', title: 'One', key: 'A#m'}, {url: '/2', title: 'Two', key: 'B♭ minor'},
        {url: '/3', title: 'Three', key: 'Bbm'}, {url: '/4', title: 'Four', key: 'C'},
    ]);
    it('facets offer one entry, in the pack\'s most used spelling; rows keep their own', () => {
        expect(facets(list).keys).toEqual(['C', 'Bbm']);
        expect(facets(list).keyAliases).toEqual({Bbm: ['A#m']});
        expect(facets(list, {mergeEnharmonicKeys: false}).keys).toEqual(['C', 'A#m', 'Bbm']);
        expect(list.map((s) => s.key)).toEqual(['A#m', 'Bbm', 'Bbm', 'C']);
    });
    it('a key filter finds every spelling (unless merging is off)', () => {
        const titles = (filter, o) => list.filter((s) => matches(s, filter, o)).map((s) => s.title);
        expect(titles({key: 'Bbm'})).toEqual(['One', 'Two', 'Three']);
        expect(titles({key: 'A#m'})).toEqual(['One', 'Two', 'Three']);
        expect(titles({key: 'A#m'}, {mergeEnharmonicKeys: false})).toEqual(['One']);
        expect(titles({query: 'bbm'})).toEqual(['One', 'Two', 'Three']);
        expect(titles({query: 'bbm'}, {mergeEnharmonicKeys: false})).toEqual(['Two', 'Three']);
    });
    it('the key sort keeps enharmonics together', () => {
        expect(sortSounds(list, 'key').map((s) => s.title)).toEqual(['Four', 'One', 'Two', 'Three']);
    });
});
