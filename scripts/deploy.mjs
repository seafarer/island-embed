// One-shot deploy: clean the target island/ folder and copy the freshly built
// dist/ into it, so index.html and _astro/ always come from the SAME build
// (the partial-copy / stale-hash footgun is what makes the embedded island
// fail to load). Run via `npm run deploy` (which builds first).
//
// Target resolution, in order:
//   1. CLI arg:           node scripts/deploy.mjs /path/to/plugin/island
//   2. env var:           ISLAND_EMBED_TARGET=/path/to/plugin/island
//   3. default:           ./plugin/island  (the in-repo reference plugin)
import { existsSync, readdirSync, rmSync, cpSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');

const target =
  process.argv[2] ||
  process.env.ISLAND_EMBED_TARGET ||
  join(root, 'plugin', 'island');

if (!existsSync(distDir) || !existsSync(join(distDir, 'index.html'))) {
  console.error('✗ No build found at dist/. Run `npm run build` first.');
  process.exit(1);
}

if (!existsSync(target)) {
  console.error(`✗ Target does not exist: ${target}`);
  console.error('  Pass the plugin island/ path as an arg or set ISLAND_EMBED_TARGET.');
  process.exit(1);
}

// Wipe everything in the target except .gitkeep, so old hashed assets can't
// linger and get served alongside a newer index.html.
for (const name of readdirSync(target)) {
  if (name === '.gitkeep') continue;
  rmSync(join(target, name), { recursive: true, force: true });
}

// Copy the *contents* of dist/ into the target (not dist/ itself).
for (const name of readdirSync(distDir)) {
  cpSync(join(distDir, name), join(target, name), { recursive: true });
}

// Report exactly what landed, so there's no Finder guesswork.
console.log(`✓ Deployed dist/ → ${target}\n`);
const astroDir = join(target, '_astro');
if (existsSync(astroDir)) {
  console.log('  _astro/');
  for (const name of readdirSync(astroDir).sort()) {
    const { size } = statSync(join(astroDir, name));
    console.log(`    ${name}  (${(size / 1024).toFixed(1)} kB)`);
  }
}
console.log('\n  Hard-refresh the page (Cmd-Shift-R) to drop any cached module.');
