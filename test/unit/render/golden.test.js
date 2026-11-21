// @vitest-environment node
// Server-rendered markup is a contract: pages already carry what 2.0.0
// rendered, and the runtime adopts it. For the inputs in
// test/fixtures/render-cases.js, the renderer must still produce exactly what
// the PUBLISHED 2.0.0 `/render` did (test/fixtures/render-2.0.0.json).
import {describe, it, expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {renderSounds, renderSoundsElement} from '../../../src/js/render/markup.js';
import {CASES, bigPack} from '../../fixtures/render-cases.js';

const golden = JSON.parse(readFileSync(new URL('../../fixtures/render-2.0.0.json', import.meta.url), 'utf8'));
const sha = (s) => createHash('sha256').update(s).digest('hex');

describe('server markup is byte-identical to 2.0.0', () => {
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
