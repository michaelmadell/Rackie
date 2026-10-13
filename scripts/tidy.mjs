// One-off tidy-up of the project layout. Moves files into folders by feature and
// rewrites every import to match. Imports of shared code become "#shared/…"
// (set up in package.json "imports"), so they no longer depend on folder depth.
//
//   node scripts/tidy.mjs           show what would change (nothing is touched)
//   node scripts/tidy.mjs --apply   do it
//
// Uses `git mv` when the project is a git repository, so file history is kept.
// Delete this script afterwards.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const APPLY = process.argv.includes('--apply');
const root = process.cwd();
const rel = (p) => path.relative(root, p).split(path.sep).join('/');
const abs = (p) => path.join(root, ...p.split('/'));

if (!fs.existsSync(abs('src/App.tsx')) || !fs.existsSync(abs('shared'))) {
  console.error('Run this from the project folder (the one with package.json, src/ and shared/).');
  process.exit(1);
}

// old path -> new path
const moves = {
  // App-wide state, API client and theme
  'src/AppContext.ts': 'src/app/AppContext.ts',
  'src/api.ts': 'src/app/api.ts',
  'src/useSite.ts': 'src/app/useSite.ts',
  'src/theme.ts': 'src/app/theme.ts',
  'src/ThemeToggle.tsx': 'src/app/ThemeToggle.tsx',
  // The React Flow canvas: building the graph, layout, cable routing, nodes and edges
  'src/buildGraph.ts': 'src/canvas/buildGraph.ts',
  'src/networkGraph.ts': 'src/canvas/networkGraph.ts',
  'src/layout.ts': 'src/canvas/layout.ts',
  'src/viewLayout.ts': 'src/canvas/viewLayout.ts',
  'src/routing.ts': 'src/canvas/routing.ts',
  'src/roomDrop.ts': 'src/canvas/roomDrop.ts',
  'src/useDeviceDrag.ts': 'src/canvas/useDeviceDrag.ts',
  'src/nodes/RackNode.tsx': 'src/canvas/nodes/RackNode.tsx',
  'src/nodes/RoomNode.tsx': 'src/canvas/nodes/RoomNode.tsx',
  'src/nodes/WallPortNode.tsx': 'src/canvas/nodes/WallPortNode.tsx',
  'src/nodes/NetDeviceNode.tsx': 'src/canvas/nodes/NetDeviceNode.tsx',
  'src/edges/CableEdge.tsx': 'src/canvas/edges/CableEdge.tsx',
  // The sidebar and its forms
  'src/Sidebar.tsx': 'src/sidebar/Sidebar.tsx',
  'src/EntityForm.tsx': 'src/sidebar/EntityForm.tsx',
  'src/PortGroupsEditor.tsx': 'src/sidebar/PortGroupsEditor.tsx',
  'src/PresetPalette.tsx': 'src/sidebar/PresetPalette.tsx',
  'src/PathView.tsx': 'src/sidebar/PathView.tsx',
  // Features
  'src/SearchBox.tsx': 'src/search/SearchBox.tsx',
  'src/search.ts': 'src/search/search.ts',
  'src/History.tsx': 'src/history/History.tsx',
  'src/ImportExport.tsx': 'src/csv/ImportExport.tsx',
  'src/CableSchedule.tsx': 'src/print/CableSchedule.tsx',
  'src/RackElevations.tsx': 'src/print/RackElevations.tsx',
  'src/PowerPanel.tsx': 'src/power/PowerPanel.tsx',
  'src/VlanPanel.tsx': 'src/vlans/VlanPanel.tsx',
  'src/PortConfigEditor.tsx': 'src/vlans/PortConfigEditor.tsx',
  'src/Attachments.tsx': 'src/attachments/Attachments.tsx',
  'src/compress.ts': 'src/attachments/compress.ts',
  // Server: the database and its rules, and CSV
  'server/db.ts': 'server/store/db.ts',
  'server/seed.ts': 'server/store/seed.ts',
  'server/integrity.ts': 'server/store/integrity.ts',
  'server/csv.ts': 'server/csv/csv.ts',
  'server/importExport.ts': 'server/csv/importExport.ts',
};

// Files left over from the Vite template that nothing uses.
const unused = ['public/icons.svg'];

// ---- Work out the plan ----

const present = Object.entries(moves).filter(([from]) => fs.existsSync(abs(from)));
const missing = Object.keys(moves).filter((from) => !fs.existsSync(abs(from)));
const clashes = present.filter(([, to]) => fs.existsSync(abs(to)));
if (clashes.length) {
  console.error('These destinations already exist, so nothing was changed:\n' + clashes.map(([, to]) => '  ' + to).join('\n'));
  process.exit(1);
}
const newPath = new Map(present.map(([from, to]) => [abs(from), abs(to)]));
const moved = (p) => newPath.get(p) ?? p;

function sourceFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}
const files = ['src', 'server', 'shared'].flatMap((d) => sourceFiles(abs(d)));

/** The file a relative import points at (tries the extensions TypeScript would). */
function resolve(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const c of [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

const sharedDir = abs('shared') + path.sep;
const IMPORT = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]*)\2/g;

/** New text for one file, with its imports pointing at where things now live. */
function rewrite(file) {
  const text = fs.readFileSync(file, 'utf8');
  const newFile = moved(file);
  const inShared = file.startsWith(sharedDir);
  let changes = 0;
  const out = text.replace(IMPORT, (whole, lead, q, spec) => {
    const target = resolve(file, spec);
    if (!target) {
      console.warn(`  ! ${rel(file)}: can't find "${spec}" (left as it is)`);
      return whole;
    }
    let next;
    if (target.startsWith(sharedDir) && !inShared) {
      // Shared code is imported the same way from anywhere: "#shared/schema"
      next = '#shared/' + rel(target).slice('shared/'.length).replace(/\.tsx?$/, '');
    } else {
      next = path.relative(path.dirname(newFile), moved(target)).split(path.sep).join('/');
      if (!next.startsWith('.')) next = './' + next;
      // Keep the extension style the import had (none for .ts/.tsx, kept for .css etc.)
      if (!/\.tsx?$/.test(spec)) next = next.replace(/\.tsx?$/, '');
    }
    if (next === spec) return whole;
    changes++;
    return `${lead}${q}${next}${q}`;
  });
  return { out, changes };
}

// ---- Show it, then (with --apply) do it ----

console.log(APPLY ? 'Tidying…\n' : 'Dry run: nothing will be changed. Run with --apply to do it.\n');
console.log('Move:');
for (const [from, to] of present) console.log(`  ${from}  →  ${to}`);
if (missing.length) console.log('\nNot found (skipped):\n' + missing.map((m) => '  ' + m).join('\n'));

const edits = files.map((f) => ({ file: f, ...rewrite(f) })).filter((e) => e.changes > 0);
console.log(`\nUpdate imports in ${edits.length} files (${edits.reduce((n, e) => n + e.changes, 0)} imports).`);

const toDelete = unused.filter((u) => fs.existsSync(abs(u)));
if (toDelete.length) console.log('\nDelete unused:\n' + toDelete.map((u) => '  ' + u).join('\n'));

const pkgPath = abs('package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const needsAlias = pkg.imports?.['#shared/*'] !== './shared/*.ts';
if (needsAlias) console.log('\nAdd to package.json:  "imports": { "#shared/*": "./shared/*.ts" }');

if (!APPLY) process.exit(0);

// 1. Rewrite imports first (paths are worked out from where files are now).
for (const e of edits) fs.writeFileSync(e.file, e.out);

// 2. Move the files.
const useGit = fs.existsSync(abs('.git'));
for (const [from, to] of present) {
  fs.mkdirSync(path.dirname(abs(to)), { recursive: true });
  if (useGit) execFileSync('git', ['mv', from, to], { cwd: root });
  else fs.renameSync(abs(from), abs(to));
}

// 3. Remove folders the moves left empty.
for (const dir of ['src/nodes', 'src/edges']) {
  if (fs.existsSync(abs(dir)) && fs.readdirSync(abs(dir)).length === 0) fs.rmdirSync(abs(dir));
}

// 4. Unused template files.
for (const u of toDelete) {
  if (useGit) execFileSync('git', ['rm', '-q', u], { cwd: root });
  else fs.rmSync(abs(u));
}

// 5. The #shared import alias.
if (needsAlias) {
  pkg.imports = { ...pkg.imports, '#shared/*': './shared/*.ts' };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

console.log(`\nDone${useGit ? ' (moved with git mv, so history is kept)' : ''}. Now run: bunx tsc -b`);