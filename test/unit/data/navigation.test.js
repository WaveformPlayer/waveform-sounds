// @vitest-environment node
import {describe, it, expect} from 'vitest';
import {rowTarget, seekTarget, sliderEdgeTarget, limitToReveal, renderedCount, firstRender, budgetToReveal, RENDER_CHUNK, SEEK_STEP, SEEK_END} from '../../../src/js/data/navigation.js';

describe('rowTarget', () => {
    it.each([
        ['ArrowDown', 0, 3, 1], ['ArrowDown', 2, 3, null],
        ['ArrowUp', 2, 3, 1], ['ArrowUp', 0, 3, 'search'],
        ['Home', 2, 3, 0], ['End', 0, 3, 2],
        ['Enter', 0, 3, null], ['ArrowDown', 0, 0, null],
    ])('%s from %i of %i → %j', (key, at, count, out) => expect(rowTarget(key, at, count)).toBe(out));
});

describe('seekTarget', () => {
    it('steps and clamps short of the end', () => {
        expect(seekTarget(0.5, 'ArrowRight')).toBeCloseTo(0.5 + SEEK_STEP);
        expect(seekTarget(0.95, 'ArrowRight')).toBe(0.999);
        expect(seekTarget(0.05, 'ArrowLeft')).toBe(0);
        expect(seekTarget(0.5, 'ArrowDown')).toBeNull();
    });
});

describe('paging', () => {
    it('rows exist for the page, or with paging off for the chunks rendered so far', () => {
        expect(renderedCount(300, 50, 999)).toBe(50);
        expect(renderedCount(30, 50, 999)).toBe(30);
        expect(renderedCount(300, Infinity, 100)).toBe(100);
        expect(renderedCount(300, Infinity, Infinity)).toBe(300);
        expect(firstRender(20)).toBe(20);
        expect(firstRender(0)).toBe(RENDER_CHUNK);
    });
    it('budgetToReveal grows by whole chunks, only when needed', () => {
        expect(budgetToReveal(50, 10)).toBe(50);
        expect(budgetToReveal(50, 50)).toBe(100);
        expect(budgetToReveal(50, 999)).toBe(1000);
    });
    it('limitToReveal grows the page only when needed', () => {
        expect(limitToReveal(2, 5)).toBe(6);
        expect(limitToReveal(10, 5)).toBe(10);
    });
});

describe('sliderEdgeTarget', () => {
    it('Home seeks to the start, End to just short of the end, anything else is not a seek', () => {
        expect(sliderEdgeTarget('Home')).toBe(0);
        expect(sliderEdgeTarget('End')).toBe(SEEK_END);
        expect(SEEK_END).toBeLessThan(1);
        expect(sliderEdgeTarget('ArrowDown')).toBeNull();
    });
});
