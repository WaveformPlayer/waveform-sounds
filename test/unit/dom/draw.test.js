// @vitest-environment node
import {describe, it, expect} from 'vitest';
import {resample, barRects} from '../../../src/js/dom/draw.js';

describe('resample', () => {
    it('keeps the loudest value of each bucket (transients survive)', () => {
        expect(resample([0.1, 0.9, 0.2, 0.3], 2)).toEqual([0.9, 0.3]);
    });
    it('interpolates between peaks when there are more bars than peaks (no flat steps)', () => {
        expect(resample([0, 1], 4)).toEqual([0, 0.25, 0.75, 1]);
        expect(resample([0.5], 3)).toEqual([0.5, 0.5, 0.5]);
        const up = resample(Array.from({length: 64}, (_, i) => i / 63), 200);
        expect(up).toHaveLength(200);
        // Strictly rising, like its input: no plateaus.
        expect(up.slice(1).every((v, i) => v >= up[i]) && new Set(up).size > 190).toBe(true);
    });
    it.each([64, 128, 7, 1000])('draws any peak count (%i) across any width', (n) => {
        const peaks = Array.from({length: n}, (_, i) => (i % 5) / 4);
        for (const bars of [20, 64, 128, 133, 400]) {
            const out = resample(peaks, bars);
            expect(out).toHaveLength(bars);
            expect(out.every((v) => v >= 0 && v <= 1)).toBe(true);
        }
        if (n > 20) expect(Math.max(...resample(peaks, 20))).toBe(1); // a downsample keeps the loudest
    });
    it('returns the input at the same length, and [] for nothing', () => {
        const p = [0.1, 0.2];
        expect(resample(p, 2)).toBe(p);
        expect(resample(null, 4)).toEqual([]);
        expect(resample([0.5], 0)).toEqual([]);
    });
});

describe('barRects', () => {
    const o = {style: 'mirror', barWidth: 2, barGap: 1};
    it('fits bars to the width (bar + gap per step)', () => {
        expect(barRects([0.5, 1], 30, 20, o)).toHaveLength(10); // (30 + 1) / 3
    });
    it('normalises to the loudest bar and keeps a 4% floor', () => {
        const r = barRects([0.25, 0.5, 0], 9, 102, o);
        expect(r.map((b) => b.h)).toEqual([50, 100, 4]);
    });
    it('mirror bars are centred; plain bars stand on the bottom', () => {
        const [m] = barRects([1], 2, 40, o);
        expect(m.y + m.h / 2).toBe(20);
        const [b] = barRects([1], 2, 40, {...o, style: 'bars'});
        expect(b.y + b.h).toBe(40);
    });
});
