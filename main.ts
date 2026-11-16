// Starfall Skiff — the program that hands the game in (Node 22, standard
// library only). It stages this repository's game/ and screenshots/ into
// the output directory and writes the dossier the judge reads, using the
// vendored make.fun library. The output must be byte-identical on every
// run, so the staging is a plain recursive copy in directory order and the
// dossier is written by buildDossier from the staged files.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root: the directory holding this file.
const repoRoot = dirname(fileURLToPath(import.meta.url));
// The grader's /output, or MAKEFUN_OUTPUT_DIR when running locally.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function stageFolder(name) {
  const source = join(repoRoot, name);
  const target = join(outputDir, name);
  if (!existsSync(source)) return;
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
stageFolder('game');
stageFolder('screenshots');

// The gate's caps for this bounty (reference/gate.json): the text cap is
// the only one that shapes the dossier's bytes; the rest refuse an entry
// the scorer would refuse — more than 4 screenshots, one over 256 KiB,
// more than 993 entries or 48 MiB under game/, or a game path over
// 1000 bytes. game/ shares /output's own 1000-entry cap with
// screenshots/ and dossier.json, so it is capped below it.
const dossierBytes = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outputDir, 'dossier.json'), dossierBytes);
