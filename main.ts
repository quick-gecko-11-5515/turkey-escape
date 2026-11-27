// Gobble & Gone — make.fun entry hand-in script (Node 22 stdlib only).
// Copies game/ and screenshots/ into MAKEFUN_OUTPUT_DIR (default /output)
// and emits dossier.json via the kit's vendored buildDossier helper.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function exportSubmissionOutput() {
  const repoRoot = dirname(fileURLToPath(import.meta.url));
  const targetDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

  mkdirSync(targetDir, { recursive: true });

  const gameSrc = join(repoRoot, 'game');
  const gameDest = join(targetDir, 'game');
  cpSync(gameSrc, gameDest, { recursive: true });

  const shotsSrc = join(repoRoot, 'screenshots');
  const shotsDest = join(targetDir, 'screenshots');
  mkdirSync(shotsDest, { recursive: true });
  if (existsSync(shotsSrc)) {
    cpSync(shotsSrc, shotsDest, { recursive: true });
  }

  const dossierJson = buildDossier(targetDir, DOSSIER_LIMITS);
  writeFileSync(join(targetDir, 'dossier.json'), dossierJson);
}

exportSubmissionOutput();
