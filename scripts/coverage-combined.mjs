// Report combined all-code coverage from the unit run (vitest istanbul, all:true ->
// coverage-unit/coverage-final.json, full file list) and the e2e run
// (vite-plugin-istanbul -> .nyc_output/pw-*.json, loaded files only).
//
// Unit and e2e instrument the same sources DIFFERENTLY (different statement maps),
// so istanbul can't merge them per-statement. Instead we take, per file, whichever
// run covered MORE statements — a file is realistically covered well by unit OR by
// e2e, not both. This gives an honest all-code percentage over the whole src tree.
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(process.argv[2] || '.');
const unitPath = path.join(root, 'coverage-unit/coverage-final.json');
const nycDir = path.join(root, '.nyc_output');

function coveredCount(fileCov) {
    const s = fileCov.s || {};
    let total = 0;
    let covered = 0;
    for (const k in s) {
        total++;
        if (s[k] > 0) covered++;
    }
    return { total, covered };
}

// path -> { total, covered } taking the better of the two runs.
const best = new Map();

// Unit coverage (vitest istanbul, all:true) — one snapshot, per-file covered/total.
const unit = {};
if (fs.existsSync(unitPath)) {
    const m = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    for (const file in m) {
        const c = coveredCount(m[file]);
        if (c.total > 0) unit[file] = c;
    }
}

// E2e coverage: the run writes ONE istanbul snapshot PER TEST/context into
// .nyc_output. All share the same vite-plugin-istanbul instrumentation for a given
// file, so a statement is covered if ANY snapshot hit it — UNION the per-statement
// hit maps across every snapshot before counting (taking a single "best" snapshot
// would badly undercount, since each test only exercises part of a file).
const e2eHits = {}; // path -> { statementKey: summedHits }
if (fs.existsSync(nycDir)) {
    for (const f of fs.readdirSync(nycDir)) {
        if (!f.endsWith('.json')) continue;
        let m;
        try {
            m = JSON.parse(fs.readFileSync(path.join(nycDir, f), 'utf8'));
        } catch {
            continue;
        }
        for (const file in m) {
            const s = m[file].s || {};
            const acc = (e2eHits[file] = e2eHits[file] || {});
            for (const k in s) acc[k] = (acc[k] || 0) + s[k];
        }
    }
}
const e2e = {};
for (const file in e2eHits) {
    let t = 0;
    let c = 0;
    for (const k in e2eHits[file]) {
        t++;
        if (e2eHits[file][k] > 0) c++;
    }
    if (t > 0) e2e[file] = { total: t, covered: c };
}

// Per file, take whichever run (unit or the e2e union) covered the file BETTER, by
// PERCENTAGE. unit (vitest istanbul) and e2e (vite-plugin-istanbul) instrument the same
// source with DIFFERENT statement maps, so a file's statement COUNT differs between runs;
// comparing absolute covered counts is apples-to-oranges (e.g. a file unit-covered 100/100
// would lose to an e2e 102/137 and be scored 74% instead of its true 100%). Comparing
// percentage and keeping the winning run's covered/total is the honest per-file measure.
for (const file of new Set([...Object.keys(unit), ...Object.keys(e2e)])) {
    const u = unit[file];
    const e = e2e[file];
    best.set(file, !u ? e : !e ? u : e.covered / e.total >= u.covered / u.total ? e : u);
}

// Always excluded from the coverage denominator (not user-facing, not testable):
//  - Potrace.js: vendored, battle-tested bitmap-tracing library.
// (The former DEAD components artefact-toolbox.vue and edition/components/sidebar.vue
// have been deleted, so they no longer need excluding.)
// --exclude-vendored additionally drops generated DTOs/types.
const DEAD = [/utils\/Potrace\.js$/];
const EXCLUDE = process.argv.includes('--exclude-vendored')
    ? [...DEAD, /\/dtos\//, /\.d\.ts$/]
    : DEAD;

const byDir = {};
let total = 0;
let covered = 0;
for (const [file, c] of best) {
    if (EXCLUDE.some((re) => re.test(file))) continue;
    total += c.total;
    covered += c.covered;
    const d = file.replace(/.*\/src\//, 'src/').split('/').slice(0, 2).join('/');
    byDir[d] = byDir[d] || { total: 0, covered: 0 };
    byDir[d].total += c.total;
    byDir[d].covered += c.covered;
}

console.log('=== combined all-code coverage (best-of unit|e2e per file) ===');
Object.entries(byDir)
    .sort((a, b) => b[1].total - b[1].total || 0)
    .sort((a, b) => (b[1].total - b[1].covered) - (a[1].total - a[1].covered))
    .forEach(([d, v]) =>
        console.log(
            `${((v.covered / v.total) * 100).toFixed(0).padStart(3)}%  ${String(v.covered).padStart(4)}/${String(v.total).padStart(4)}  unc=${String(v.total - v.covered).padStart(4)}  ${d}`,
        ),
    );
console.log('-----------------------------------------------------------');
console.log(`TOTAL: ${((covered / total) * 100).toFixed(2)}%  (${covered}/${total} statements)${EXCLUDE.length ? '  [vendored/generated excluded]' : ''}`);
