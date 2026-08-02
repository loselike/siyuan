#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const statePath = path.join(repositoryRoot, '.codex-state.md');
const devNowPath = path.join(repositoryRoot, 'docs/dev-now');
const stateArchivePath = path.join(repositoryRoot, 'docs/archive/codex-state');
const devNowArchivePath = path.join(repositoryRoot, 'docs/archive/dev-now');
const devNowBacklogPath = path.join(repositoryRoot, 'docs/backlog/dev-now');
const failures = [];

const maxStateBytes = 16 * 1024;
const maxCurrentHeadings = 12;
const maxActiveFiles = 12;
const activeStatuses = new Set(['in_progress', 'handed_off', 'blocked']);
const terminalStatuses = new Set(['complete', 'completed', 'done', 'published_47', 'released']);

function markdownFiles(directory, recursive = false) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return recursive ? markdownFiles(entryPath, true) : [];
    return entry.isFile() && entry.name.endsWith('.md') ? [entryPath] : [];
  });
}

function statusOf(source) {
  const match = source.match(/^- 状态：\s*`?([^`\n]+?)`?\s*$/m);
  return match?.[1]?.trim();
}

if (!existsSync(statePath)) {
  failures.push('.codex-state.md is missing');
} else {
  const state = readFileSync(statePath, 'utf8');
  const stateBytes = Buffer.byteLength(state);
  const currentHeadings = (state.match(/^## 当前 /gm) ?? []).length;
  if (stateBytes > maxStateBytes) failures.push(`.codex-state.md is ${stateBytes} bytes; maximum is ${maxStateBytes}`);
  if (currentHeadings > maxCurrentHeadings) failures.push(`.codex-state.md has ${currentHeadings} current headings; maximum is ${maxCurrentHeadings}`);
  if (!state.includes('docs/archive/codex-state/')) failures.push('.codex-state.md must link to its history archive');
}

const activeFiles = markdownFiles(devNowPath)
  .filter((file) => !path.basename(file).startsWith('_'));
if (activeFiles.length > maxActiveFiles) failures.push(`docs/dev-now has ${activeFiles.length} active files; maximum is ${maxActiveFiles}`);
for (const file of activeFiles) {
  const relative = path.relative(repositoryRoot, file);
  const status = statusOf(readFileSync(file, 'utf8'));
  if (!status) failures.push(`${relative} has no canonical status line`);
  else if (terminalStatuses.has(status)) failures.push(`${relative} is terminal and must be archived`);
  else if (!activeStatuses.has(status)) failures.push(`${relative} has non-active status: ${status}`);
}

const archivedStateFiles = markdownFiles(stateArchivePath, true);
if (!archivedStateFiles.length) failures.push('docs/archive/codex-state has no preserved history');

const locations = [devNowPath, devNowArchivePath, devNowBacklogPath];
const names = new Map();
for (const directory of locations) {
  for (const file of markdownFiles(directory, true)) {
    if (path.basename(file).startsWith('_')) continue;
    const name = path.basename(file);
    const previous = names.get(name);
    if (previous) failures.push(`duplicate dev context file ${name}: ${previous} and ${path.relative(repositoryRoot, file)}`);
    else names.set(name, path.relative(repositoryRoot, file));
  }
}

if (failures.length) {
  console.error('CONTEXT_GOVERNANCE_FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('CONTEXT_GOVERNANCE_OK');
console.log(`STATE_BYTES=${statSync(statePath).size}`);
console.log(`ACTIVE_DEV_CONTEXTS=${activeFiles.length}`);
console.log(`ARCHIVED_DEV_CONTEXTS=${markdownFiles(devNowArchivePath, true).length}`);
console.log(`BACKLOG_DEV_CONTEXTS=${markdownFiles(devNowBacklogPath, true).length}`);
