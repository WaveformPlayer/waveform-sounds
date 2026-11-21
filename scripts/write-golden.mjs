// Regenerate test/fixtures/render-2.2.0.json from the BUILT /render entry
// (`npm run build` first). Only on purpose: the server markup is a contract
// (test/unit/render/golden.test.js), and a change to it belongs in the
// CHANGELOG under "Changed (markup)".
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {renderSounds, renderSoundsElement} from '../dist/waveform-sounds-render.esm.js';
import {CASES, bigPack} from '../test/fixtures/render-cases.js';

const sha = (s) => createHash('sha256').update(s).digest('hex');
const version = '2.2.0';
const out = {
    version,
    cases: CASES.map(([name, fn, sounds, options, cls]) => ({name, html: fn === 'element' ? renderSoundsElement(sounds, options, cls) : renderSounds(sounds, options)})),
    big: sha(renderSounds(bigPack(), {})),
    bigStrip: sha(renderSounds(bigPack(), {player: 'strip', pageSize: 25})),
};
writeFileSync(new URL(`../test/fixtures/render-${version}.json`, import.meta.url), `${JSON.stringify(out, null, 1)}\n`);
console.log(`render-${version}.json: ${out.cases.length} cases`);
