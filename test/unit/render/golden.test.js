// @vitest-environment node
// Server-rendered markup is a contract: pages (and the framework wrappers'
// hydration) carry what `/render` makes, and the runtime adopts it. For the
// inputs in test/fixtures/render-cases.js the renderer must produce exactly
// 2.2.0's markup (test/fixtures/render-2.2.0.json). 2.2.0 changed it on
// purpose (CHANGELOG, "Changed (markup)"); a change from here must be as
// deliberate: regenerate with `npm run build && node scripts/write-golden.mjs`.
import {describe, it, expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {renderSounds, renderSoundsElement} from '../../../src/js/render/markup.js';
import {CASES, bigPack} from '../../fixtures/render-cases.js';

const golden = JSON.parse(readFileSync(new URL('../../fixtures/render-2.2.0.json', import.meta.url), 'utf8'));
const sha = (s) => createHash('sha256').update(s).digest('hex');

describe('server markup is byte-identical to 2.2.0', () => {
    it('covers every case', () => expect(golden.cases.map((c) => c.name)).toEqual(CASES.map((c) => c[0])));

    it.each(CASES.map((c, i) => [c[0], c, golden.cases[i]]))('%s', (name, [, fn, sounds, options, cls], expected) => {
        expect(expected.name).toBe(name);
        const html = fn === 'element' ? renderSoundsElement(sounds, options, cls) : renderSounds(sounds, options);
        expect(html).toBe(expected.html);
    });

    it('a 300-sound pack, inline and strip', () => {
        expect(sha(renderSounds(bigPack(), {}))).toBe(golden.big);
        expect(sha(renderSounds(bigPack(), {player: 'strip', pageSize: 25}))).toBe(golden.bigStrip);
    });
});
