#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const devNowPath = path.join(repositoryRoot, 'docs/dev-now');
const apply = process.argv.includes('--apply');
const periodArg = process.argv.find((argument) => argument.startsWith('--period='));
const period = periodArg?.slice('--period='.length) || new Date().toISOString().slice(0, 7);
if (!/^\d{4}-\d{2}$/.test(period)) throw new Error(`Invalid archive period: ${period}`);

const terminalStatuses = new Set(['complete', 'completed', 'done', 'published_47', 'released']);
const pendingMarkers = /未发布|待发布|本地|completed-local|待用户授权/;

function statusOf(source) {
  const match = source.match(/^- 状态：\s*`?([^`\n]+?)`?\s*$/m);
  return match?.[1]?.trim();
}

const candidates = readdirSync(devNowPath, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('_'))
  .map((entry) => {
    const source = readFileSync(path.join(devNowPath, entry.name), 'utf8');
    const status = statusOf(source);
    const destinationGroup = status && terminalStatuses.has(status)
      ? 'archive'
      : status && pendingMarkers.test(status)
        ? 'backlog'
        : undefined;
    return { name: entry.name, status, destinationGroup };
  })
  .filter((candidate) => candidate.destinationGroup);

for (const candidate of candidates) {
  const source = path.join(devNowPath, candidate.name);
  const destinationDir = path.join(repositoryRoot, 'docs', candidate.destinationGroup, 'dev-now', period);
  const destination = path.join(destinationDir, candidate.name);
  console.log(`${apply ? 'MOVE' : 'WOULD_MOVE'} ${path.relative(repositoryRoot, source)} -> ${path.relative(repositoryRoot, destination)}`);
  if (!apply) continue;
  if (existsSync(destination)) throw new Error(`Refusing to overwrite existing context: ${destination}`);
  mkdirSync(destinationDir, { recursive: true });
  renameSync(source, destination);
}

console.log(`CONTEXT_ARCHIVE_${apply ? 'APPLIED' : 'DRY_RUN'}=${candidates.length}`);
