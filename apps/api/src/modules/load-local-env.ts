import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const candidateFiles = ['.env.local', '.env', '../../.env.local', '../../.env'];

for (const file of candidateFiles) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) {
    continue;
  }

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}
