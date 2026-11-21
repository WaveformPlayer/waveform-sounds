// @vitest-environment node
import {describe, it, expect, vi} from 'vitest';
import {engineOptions, enginePeaks, engineTrack} from '../../../src/js/core/engine.js';

describe('engineOptions', () => {
    it('defaults by layout; the site overrides; audioMode is always self', () => {
        expect(engineOptions(null, 'inline', {})).toMatchObject({height: 32, waveformStyle: 'bars', singlePlay: true, audioMode: 'self'});
        expect(engineOptions({height: 80, audioMode: 'external'}, 'strip', {})).toMatchObject({height: 80, waveformStyle: 'mirror', audioMode: 'self'});
    });
    it("the list's callbacks always run, then the site's", () => {
        const order = [];
        const opts = engineOptions({onPlay: (p) => order.push(`site:${p}`)}, 'inline', {onPlay: (p) => order.push(`list:${p}`)});
        opts.onPlay('x');
        expect(order).toEqual(['list:x', 'site:x']);
    });
    it('the list owns looping: loop and showLoop are forced off', () => {
        // The player's loop would stop `ended` (no autoAdvance, a row stuck
        // playing) and its toggle would loop one-shots behind the list's back.
        expect(engineOptions({loop: true, showLoop: true}, 'strip', {})).toMatchObject({loop: false, showLoop: false});
        expect(engineOptions(null, 'inline', {})).toMatchObject({loop: false, showLoop: false});
    });
    it('per-track options are dropped (each sound brings its own)', () => {
        const opts = engineOptions({duration: 187, downloadUrl: '/one.wav', downloadName: 'one.wav', height: 60}, 'strip', {});
        for (const key of ['duration', 'downloadUrl', 'downloadName']) expect(opts).not.toHaveProperty(key);
        expect(opts.height).toBe(60);
    });
    it('the other 2.0 options pass through', () => {
        const site = {lazy: true, showVolume: true, volume: 0.5, showDownload: true, downloadLabel: 'Get', muteLabel: 'Mute'};
        expect(engineOptions(site, 'strip', {})).toMatchObject(site);
    });
    it('a callback the list does not handle still reaches the site', () => {
        const onError = vi.fn();
        engineOptions({onError}, 'inline', {}).onError('boom');
        expect(onError).toHaveBeenCalledWith('boom');
    });
});

describe('enginePeaks', () => {
    const sound = {peaks: [0.5], waveform: '/full.json'};
    it('strip prefers the full sidecar; inline the row peaks', () => {
        expect(enginePeaks(sound, 'strip')).toBe('/full.json');
        expect(enginePeaks(sound, 'inline')).toEqual([0.5]);
        expect(enginePeaks({peaks: null, waveform: null}, 'strip')).toBeNull();
    });
});

describe('engineTrack', () => {
    const base = {peaks: [0.5], waveform: null, duration: null, download: null};
    it('peaks and autoplay; nothing per-track the sound lacks', () => {
        expect(engineTrack(base, 'inline', true)).toEqual({waveform: [0.5], autoplay: true});
        expect(engineTrack({...base, duration: 0}, 'strip', false)).toEqual({waveform: [0.5], autoplay: false});
        expect(engineTrack(base, 'strip', false, 'none')).toEqual({waveform: [0.5], autoplay: false, preload: 'none'});
    });
    it("a known duration and the row's download link go with the sound", () => {
        expect(engineTrack({...base, duration: 8.02, download: '/a.wav'}, 'inline', true))
            .toEqual({waveform: [0.5], autoplay: true, duration: 8.02, downloadUrl: '/a.wav'});
    });
});
