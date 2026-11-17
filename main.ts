// token-radar-01 entrypoint.
//
// Reads the sealed snapshot, prices every pre-token protocol with lib/model.ts, writes the ranked
// board to /output/board.json, writes the page's data to /output/data.js, copies dashboard/ and
// screenshots/ into /output, and writes /output/dossier.json with the vendored library. Standard
// library only: no network, no framework, no build step.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const TEXT_MAX_BYTES = 65_536;
const SHOT_CAPS = { max: 4, max_bytes: 524_288 };
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1] as string;
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq === undefined ? fallback : eq.slice(name.length + 3);
}

const inputArg = arg('input', '/input');
const inputFile = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
const out = arg('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

// Preflight, explicitly and before any work: a run with no snapshot has nothing to rank, so it
// says so on stderr and exits 2 rather than writing a half-built output directory. The message
// always carries the words "no snapshot", which is what a calling harness greps for.
if (!existsSync(inputFile)) {
  process.stderr.write(`token radar: no snapshot — nothing at ${inputFile}; pass --input <snapshot.json or its directory>\n`);
  process.exit(2);
}

const snapshot = parseSnapshot(readFileSync(inputFile, 'utf8'));
const { board, radar } = buildRadar(snapshot);
const issue = boardIssue(board, snapshot);
if (issue !== null) {
  process.stderr.write(`token radar: the board breaks the gate: ${issue}\n`);
  process.exit(1);
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
writeFileSync(join(out, 'data.js'), dataScript(radar));

function copyDir(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const path = join(from, name);
    if (!statSync(path).isFile()) continue;
    copyFileSync(path, join(to, name));
    copied.push(name);
  }
  return copied;
}

const page = copyDir(join(here, 'dashboard'), join(out, 'dashboard'));
const shots = copyDir(join(here, 'screenshots'), join(out, 'screenshots'));
if (shots.length < 3) {
  process.stderr.write(`token radar: screenshots/ holds ${shots.length}, the gate wants 3\n`);
  process.exit(1);
}
for (const name of shots) {
  if (!IMAGE_NAME.test(name)) {
    process.stderr.write(`token radar: screenshots/${name} has a name the gate refuses\n`);
    process.exit(1);
  }
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: TEXT_MAX_BYTES, screenshots: SHOT_CAPS, dashboard: { max_files: 400, max_bytes: 4_194_304 } }),
);

// The summary names the board's first row, so a reader of the log knows what the run actually
// ranked without opening board.json.
const top = board[0];
const topLine = top === undefined
  ? 'top row: none — no launch candidate in this snapshot'
  : `top row: #1 ${top.name} (${top.category ?? 'unclassified'}) implied value $${top.implied_value_usd.toLocaleString('en-US')} on $${top.tvl_usd.toLocaleString('en-US')} TVL`;

process.stdout.write(
  `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ${board.length} ranked ` +
    `(${radar.pre_token} pre-token, ${radar.live.length} live-token separate)\n` +
    `token radar: ${topLine}\n` +
    `token radar: wrote ${page.length} page files, ${shots.length} screenshots, board.json, data.js and dossier.json to ${out}\n`,
);
