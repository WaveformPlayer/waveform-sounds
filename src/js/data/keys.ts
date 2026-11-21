/**
 * Musical keys beyond their spelling: which keys sound the same
 * (enharmonics: A#m and Bbm), which spelling a merged filter entry shows,
 * and how keys sort. Pure — shared by the renderer and the runtime.
 *
 * Keys arrive here already in the short form `normalizeKey()` writes
 * (`'Fm'`, `'C#'`, `'Bb'`); anything else is a label to keep as given.
 *
 * @module keys
 */

/** Pitch class of each root spelling, C = 0. The theoretical spellings
 *  (Cb, B#, E#, Fb) are here so they merge with the keys they sound as. */
export const KEY_PITCH: Record<string, number> = {
    C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, 'E#': 5, F: 5, 'F#': 6, Gb: 6,
    G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11,
};

/**
 * The conventional spelling of each key: its key signature with the fewest
 * accidentals (Db major has 5 flats, C# major 7 sharps), and for the two
 * six-and-six ties the Camelot wheel's (F# major, Eb minor). Index = pitch
 * class.
 */
const CONVENTIONAL_MAJOR = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const CONVENTIONAL_MINOR = ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];

/** The sharp and flat spelling of each pitch class (for search). */
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * A key's parts: its root spelling, pitch class and mode.
 *
 * @param key - A normalised key (`'A#m'`).
 * @returns null for a label that isn't a key.
 */
export function parseKey(key: string | null | undefined): {root: string, pitch: number, minor: boolean} | null {
    const m = /^([A-G][#b]?)(m?)$/.exec(String(key ?? ''));
    if (!m || KEY_PITCH[m[1]] === undefined) return null;
    return {root: m[1], pitch: KEY_PITCH[m[1]], minor: m[2] === 'm'};
}

/**
 * What a key sounds as: pitch class and mode (`'10m'` for A#m and Bbm).
 * Two keys are enharmonic when their classes match.
 *
 * @param key - A normalised key.
 * @returns The class, or the label itself when it isn't a key (so it only
 *   ever matches itself).
 */
export function keyClass(key: string): string {
    const k = parseKey(key);
    return k ? `${k.pitch}${k.minor ? 'm' : ''}` : key;
}

/**
 * Is a sound in key `b` (the filter's) when it is written `a`? The same
 * spelling always is; with `merge`, so is any enharmonic one.
 *
 * @param a - The sound's key.
 * @param b - The filter's key.
 * @param merge - Treat enharmonic spellings as one key.
 */
export function sameKey(a: string, b: string, merge: boolean = true): boolean {
    return a === b || (merge && !!a && keyClass(a) === keyClass(b));
}

/**
 * Sort rank of a key: by pitch from C, majors before minors; unknown
 * labels after every key, no key at all last.
 *
 * @param key
 */
export function keyRank(key: string): number {
    if (!key) return Infinity;
    const k = parseKey(key);
    return k ? k.pitch * 2 + (k.minor ? 1 : 0) : 1000;
}

/**
 * Every common spelling of a key (`'A#m'` → `['A#m', 'Bbm']`), for search:
 * typing either finds both when keys are merged.
 *
 * @param key
 */
export function enharmonics(key: string): string[] {
    const k = parseKey(key);
    if (!k) return key ? [key] : [];
    const mode = k.minor ? 'm' : '';
    return [...new Set([key, SHARPS[k.pitch] + mode, FLATS[k.pitch] + mode])];
}

/**
 * The spelling a merged key entry shows: the one the pack uses most; a
 * tie goes to the conventional spelling (see {@link CONVENTIONAL_MAJOR})
 * when it is one of the tied, else to the first in alphabetical order.
 *
 * @param counts - Each spelling of ONE key, with how many sounds use it.
 */
export function canonicalSpelling(counts: Map<string, number>): string {
    let best = 0;
    for (const n of counts.values()) if (n > best) best = n;
    const tied = [...counts].filter(([, n]) => n === best).map(([k]) => k).sort();
    if (tied.length === 1) return tied[0];
    const k = parseKey(tied[0]);
    const conventional = k ? (k.minor ? CONVENTIONAL_MINOR : CONVENTIONAL_MAJOR)[k.pitch] : '';
    return tied.includes(conventional) ? conventional : tied[0];
}

/**
 * The keys a list offers, merged or not: each entry once, in musical
 * order, with the other spellings merged into it.
 *
 * @param keys - Every sound's key ('' for none), duplicates included.
 * @param merge - Merge enharmonic spellings into one entry.
 * @returns `keys` (the entries) and `aliases` (entry → the other spellings
 *   the list uses for it; only entries that have some).
 */
export function keyEntries(keys: string[], merge: boolean = true): {keys: string[], aliases: Record<string, string[]>} {
    const groups = new Map<string, Map<string, number>>();
    for (const key of keys) {
        if (!key) continue;
        const cls = merge ? keyClass(key) : key;
        const g = groups.get(cls) ?? new Map<string, number>();
        groups.set(cls, g);
        g.set(key, (g.get(key) || 0) + 1);
    }
    const out: string[] = [];
    const aliases: Record<string, string[]> = {};
    for (const g of groups.values()) {
        const entry = canonicalSpelling(g);
        out.push(entry);
        const others = [...g.keys()].filter((k) => k !== entry).sort();
        if (others.length) aliases[entry] = others;
    }
    out.sort((a, b) => keyRank(a) - keyRank(b) || a.localeCompare(b));
    return {keys: out, aliases};
}

/**
 * The entry of `entries` a key belongs to: itself, or with `merge` the
 * entry it is enharmonic to (`?key=A#m` on a list whose entry is Bbm).
 *
 * @param key - A normalised key.
 * @param entries - The list's key entries ({@link keyEntries}).
 * @param merge
 * @returns The entry, or '' when the list has no such key.
 */
export function keyEntry(key: string, entries: string[], merge: boolean = true): string {
    if (!key) return '';
    if (entries.includes(key)) return key;
    if (!merge) return '';
    const cls = keyClass(key);
    return entries.find((e) => keyClass(e) === cls) ?? '';
}
