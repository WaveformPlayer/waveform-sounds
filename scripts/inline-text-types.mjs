/**
 * Make the generated declarations self-contained.
 *
 * `@arraypress/text` is a devDependency: esbuild inlines it into dist/, so
 * consumers never install it. But `render/markup.ts` re-exports its
 * `escapeHtml` (the `/render` entry's), and tsc writes that as an import
 * from '@arraypress/text' — which a consumer can't resolve. So, after
 * `tsc -p tsconfig.build.json`, copy text's own declaration file into
 * types/vendor/ and point those imports at the copy. Run by `build:types`.
 */
import {copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const types = join(root, 'types');
const vendored = join(types, 'vendor', 'arraypress-text.d.ts');

mkdirSync(dirname(vendored), {recursive: true});
copyFileSync(join(root, 'node_modules', '@arraypress', 'text', 'src', 'index.d.ts'), vendored);

let rewritten = 0;
for (const name of readdirSync(types, {recursive: true})) {
    const file = join(types, name);
    if (!file.endsWith('.d.ts') || file === vendored) continue;
    const src = readFileSync(file, 'utf8');
    if (!src.includes("'@arraypress/text'")) continue;
    let spec = relative(dirname(file), vendored).split(sep).join('/').replace(/\.d\.ts$/, '.js');
    if (!spec.startsWith('.')) spec = `./${spec}`;
    writeFileSync(file, src.replaceAll("from '@arraypress/text'", `from '${spec}'`));
    rewritten++;
}
if (!rewritten) throw new Error('inline-text-types: no declaration imports @arraypress/text; is this step still needed?');
