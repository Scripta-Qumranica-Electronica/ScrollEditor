#!/usr/bin/env node
// Aggregate tests/playwright/.api-audit.jsonl (produced by an
// `API_AUDIT=1 npx playwright test` run) into a route-shape -> {verb -> [specs]}
// map, so API-COVERAGE.md's "covered-by" column can be filled.
//
// Route shapes are normalised: numeric ids -> {id}, imaged-object ids
// (institution-plate-fragment, e.g. IAA-1039-1) -> {ioId}, long tokens -> {token}.
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(__dirname, '../tests/playwright/.api-audit.jsonl');

function normalise(url) {
    return url
        .split('/')
        .map((seg) => {
            if (/^\d+$/.test(seg)) return '{id}';
            if (/^[A-Za-z0-9]+-\d+-\d+$/.test(seg)) return '{ioId}';
            if (seg.length >= 24) return '{token}';
            return seg;
        })
        .join('/');
}

const lines = fs
    .readFileSync(FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));

// route -> verb -> Set(spec test titles)
const map = {};
for (const { test, method, url } of lines) {
    const route = normalise(url);
    const key = `${method} ${route}`;
    (map[key] ??= new Set()).add(test);
}

const sorted = Object.keys(map).sort();
for (const key of sorted) {
    const specs = [...map[key]].sort();
    console.log(`${key}  [${specs.length} tests]`);
    for (const s of specs) console.log(`    - ${s}`);
}
console.log(`\nTOTAL distinct verb+route hit: ${sorted.length}`);
