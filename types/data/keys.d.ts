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
export declare const KEY_PITCH: Record<string, number>;
/**
 * A key's parts: its root spelling, pitch class and mode.
 *
 * @param key - A normalised key (`'A#m'`).
 * @returns null for a label that isn't a key.
 */
export declare function parseKey(key: string | null | undefined): {
    root: string;
    pitch: number;
    minor: boolean;
} | null;
/**
 * What a key sounds as: pitch class and mode (`'10m'` for A#m and Bbm).
 * Two keys are enharmonic when their classes match.
 *
 * @param key - A normalised key.
 * @returns The class, or the label itself when it isn't a key (so it only
 *   ever matches itself).
 */
export declare function keyClass(key: string): string;
/**
 * Is a sound in key `b` (the filter's) when it is written `a`? The same
 * spelling always is; with `merge`, so is any enharmonic one.
 *
 * @param a - The sound's key.
 * @param b - The filter's key.
 * @param merge - Treat enharmonic spellings as one key.
 */
export declare function sameKey(a: string, b: string, merge?: boolean): boolean;
/**
 * Sort rank of a key: by pitch from C, majors before minors; unknown
 * labels after every key, no key at all last.
 *
 * @param key
 */
export declare function keyRank(key: string): number;
/**
 * Every common spelling of a key (`'A#m'` → `['A#m', 'Bbm']`), for search:
 * typing either finds both when keys are merged.
 *
 * @param key
 */
export declare function enharmonics(key: string): string[];
/**
 * The spelling a merged key entry shows: the one the pack uses most; a
 * tie goes to the conventional spelling (see {@link CONVENTIONAL_MAJOR})
 * when it is one of the tied, else to the first in alphabetical order.
 *
 * @param counts - Each spelling of ONE key, with how many sounds use it.
 */
export declare function canonicalSpelling(counts: Map<string, number>): string;
/**
 * The keys a list offers, merged or not: each entry once, in musical
 * order, with the other spellings merged into it.
 *
 * @param keys - Every sound's key ('' for none), duplicates included.
 * @param merge - Merge enharmonic spellings into one entry.
 * @returns `keys` (the entries) and `aliases` (entry → the other spellings
 *   the list uses for it; only entries that have some).
 */
export declare function keyEntries(keys: string[], merge?: boolean): {
    keys: string[];
    aliases: Record<string, string[]>;
};
/**
 * The entry of `entries` a key belongs to: itself, or with `merge` the
 * entry it is enharmonic to (`?key=A#m` on a list whose entry is Bbm).
 *
 * @param key - A normalised key.
 * @param entries - The list's key entries ({@link keyEntries}).
 * @param merge
 * @returns The entry, or '' when the list has no such key.
 */
export declare function keyEntry(key: string, entries: string[], merge?: boolean): string;
//# sourceMappingURL=keys.d.ts.map