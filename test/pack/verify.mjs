/**
 * Check the PACKED package the way a consumer meets it (the vitest suite
 * imports src/, so it can't see a wrong exports map, a file missing from
 * the tarball or a bundle that breaks in a <script> tag). Packs this
 * package and the installed core, installs both into a throwaway consumer,
 * then checks, against files from the tarball only:
 *
 *   1. every file the exports map names is in the tarball;
 *   2. each entry loads by import AND by require() (Node 22.12+ require(esm));
 *   3. `/render` renders in plain Node — no DOM, no jsdom — and matches the
 *      default entry's renderSounds byte for byte;
 *   4. the types resolve for all three entries under moduleResolution
 *      bundler and nodenext;
 *   5. the script-tag build, after the core's, adopts server-rendered markup
 *      in jsdom and builds its one engine player.
 *
 *   npm run test:pack        (exit 1 if any check fails)
 */
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {JSDOM} from 'jsdom';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const NAME = '@arraypress/waveform-sounds';
const ENTRIES = [NAME, `${NAME}/no-autoinit`, `${NAME}/render`];
const run = (cmd, args, cwd) => execFileSync(cmd, args, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});

let failed = 0, total = 0;
/** Record one check. */
const check = (name, ok, detail = '') => {
    total++;
    if (!ok) failed++;
    console.log(`${ok ? '  ✓' : '  ✗'} ${name}${ok || !detail ? '' : `\n      ${detail}`}`);
};
/** `npm pack --json` into `dest`; npm 12 prints an object keyed by name, older npm an array. */
const pack = (dir, dest) => {
    const out = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', dest], dir));
    return (Array.isArray(out) ? out : Object.values(out))[0];
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'waveform-sounds-pack-'));
try {
    const packed = pack(ROOT, tmp);
    const core = pack(fs.realpathSync(path.join(ROOT, 'node_modules', '@arraypress', 'waveform-player')), tmp);
    const shipped = new Set(packed.files.map((f) => f.path));
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const targets = new Set(Object.values(pkg.exports).flatMap((e) => (typeof e === 'string' ? [e] : Object.values(e))));
    console.log(`\n${packed.filename} (${packed.files.length} files)`);
    for (const t of [...targets].filter((t) => !t.includes('*'))) check(`ships ${t}`, shipped.has(t.replace(/^\.\//, '')));

    const consumer = path.join(tmp, 'consumer');
    fs.mkdirSync(consumer);
    fs.writeFileSync(path.join(consumer, 'package.json'), '{"name":"consumer","private":true,"type":"module"}');
    run('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts', path.join(tmp, core.filename), path.join(tmp, packed.filename), 'typescript'], consumer);

    console.log('\nPlain Node (no DOM)');
    fs.writeFileSync(path.join(consumer, 'probe.mjs'), `
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const out = {dom: typeof document !== 'undefined' || typeof window !== 'undefined'};
for (const spec of ${JSON.stringify(ENTRIES)}) {
    const esm = await import(spec), cjs = require(spec);
    out[spec] = {esm: typeof esm.renderSounds, cjs: typeof cjs.renderSounds, cls: typeof (esm.default ?? esm.WaveformSounds), same: esm.renderSounds === cjs.renderSounds && esm.default === cjs.default};
}
const sounds = [{url: '/a/Bass_Loop_128_Fmin.wav', type: 'Bass', duration: 8, peaks: '00ff80', loop: true}, {url: '/a/kick.wav', title: 'Kick <1>'}];
const R = await import('${NAME}/render'), M = await import('${NAME}');
out.html = R.renderSounds(sounds, {player: 'strip'}, 'p');
out.identical = out.html === M.renderSounds(sounds, {player: 'strip'}, 'p');
console.log(JSON.stringify(out));`);
    const r = JSON.parse(run('node', ['probe.mjs'], consumer));
    check('no DOM globals in this process', r.dom === false);
    for (const spec of ENTRIES) {
        check(`${spec}: import and require() give renderSounds`, r[spec].esm === 'function' && r[spec].cjs === 'function', JSON.stringify(r[spec]));
        check(`${spec}: require() loads the same module instance`, r[spec].same);
    }
    check(`${NAME} and /no-autoinit export the class`, r[NAME].cls === 'function' && r[`${NAME}/no-autoinit`].cls === 'function');
    check('/render renders in plain Node', /data-ws-list/.test(r.html) && r.html.includes('Kick &lt;1&gt;'));
    check('/render matches the default entry byte for byte', r.identical);

    console.log('\nTypes');
    fs.writeFileSync(path.join(consumer, 'probe.ts'), `
import WaveformSounds, {type WaveformSoundsOptions, type Sound} from '${NAME}';
import {WaveformSounds as NoInit} from '${NAME}/no-autoinit';
import {renderSounds, parseManifest, type SoundInput} from '${NAME}/render';
const opts: WaveformSoundsOptions = {player: 'strip', playerOptions: {height: 64}, onPlay: (s: Sound) => s.title};
const input: SoundInput[] = [{url: '/a.wav', duration: 8}];
export const html: string = renderSounds(input, opts);
export const list: Sound[] = parseManifest({sounds: input});
export const same: typeof WaveformSounds = NoInit;
document.querySelector('div')?.addEventListener('waveformsounds:play', (e) => e.detail.sound.url);`);
    for (const [mod, res] of [['esnext', 'bundler'], ['nodenext', 'nodenext']]) {
        const cfg = {compilerOptions: {strict: true, noEmit: true, skipLibCheck: false, lib: ['ES2022', 'DOM'], module: mod, moduleResolution: res, types: []}, files: ['probe.ts']};
        fs.writeFileSync(path.join(consumer, `tsconfig.${res}.json`), JSON.stringify(cfg));
        let detail = '';
        try { run('npx', ['tsc', '-p', `tsconfig.${res}.json`], consumer); } catch (e) { detail = (e.stdout || e.stderr || '').trim().split('\n').slice(0, 6).join('\n      '); }
        check(`all three entries typecheck under moduleResolution: ${res}`, !detail, detail);
    }

    console.log('\nScript tags (jsdom)');
    const mods = path.join(consumer, 'node_modules', '@arraypress');
    const markup = r.html;
    for (const file of ['waveform-sounds.js', 'waveform-sounds.min.js']) {
        const dom = new JSDOM(`<!doctype html><body><div data-waveform-sounds data-player="strip">${markup}</div></body>`, {runScripts: 'dangerously', pretendToBeVisual: true});
        const {window} = dom;
        window.matchMedia = () => ({matches: false, addEventListener() {}, removeEventListener() {}});
        window.HTMLCanvasElement.prototype.getContext = () => null;
        window.HTMLMediaElement.prototype.load = () => {};
        for (const src of [path.join(mods, 'waveform-player', 'dist', 'waveform-player.min.js'), path.join(mods, 'waveform-sounds', 'dist', file)]) {
            const s = window.document.createElement('script');
            s.textContent = fs.readFileSync(src, 'utf8');
            window.document.body.appendChild(s);
        }
        const strict = fs.readFileSync(path.join(mods, 'waveform-sounds', 'dist', file), 'utf8').startsWith('"use strict"');
        const ws = [...(window.WaveformSounds?.instances.values() ?? [])][0];
        await ws?.ready;
        const ok = !!ws && ws.sounds.length === 2 && ws.engine instanceof window.WaveformPlayer && !ws.engine.options.loop;
        check(`${file}: strict, adopts the markup, builds one engine`, strict && ok, `strict=${strict}, instance=${!!ws}, sounds=${ws?.sounds.length}, engine=${ws?.engine?.constructor?.name}`);
        window.close();
    }
} finally {
    fs.rmSync(tmp, {recursive: true, force: true});
}
console.log(`\n${failed ? '✗' : '✓'} ${total - failed}/${total} checks passed\n`);
process.exit(failed ? 1 : 0);
