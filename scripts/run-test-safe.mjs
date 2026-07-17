#!/usr/bin/env node

import { spawn } from 'node:child_process';

const DEFAULT_TIMEOUT_MS = 120_000;
const GRACE_MS = 2_000;
const GROUP_SETTLE_MS = 150;

const rawArgs = process.argv.slice(2);
if (!rawArgs.length) {
  console.error('Usage: npm run test:safe -- <command> [args...]');
  console.error('Example: npm run test:safe -- npm test -w @siyuan/web -- --run src/modules/finance/finance.test.tsx -t 录单草稿箱');
  process.exit(2);
}

const timeoutMs = Number(process.env.SAFE_TEST_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
const [command, ...args] = rawArgs;
const guardedArgs = addVitestSafetyArgs(command, args);
const child = spawn(command, guardedArgs, {
  detached: true,
  stdio: 'inherit',
  env: {
    ...process.env,
    VITEST_MAX_THREADS: '1',
    VITEST_MIN_THREADS: '1',
    VITEST_MAX_FORKS: '1',
    VITEST_MIN_FORKS: '1'
  }
});

let finished = false;
let stopping = false;
let timeout;
let killTimer;

function isNpmTestInvocation(bin, commandArgs) {
  if (!['npm', 'pnpm', 'yarn'].includes(bin)) return false;
  return commandArgs[0] === 'test' || (commandArgs[0] === 'run' && /^test(?::|$)/.test(commandArgs[1] ?? ''));
}

function addVitestSafetyArgs(bin, commandArgs) {
  if (!isNpmTestInvocation(bin, commandArgs)) return commandArgs;
  // Appended last so a user cannot accidentally restore the default fork pool
  // or parallel workers through an earlier command argument.
  return [
    ...commandArgs,
    ...(commandArgs.includes('--') ? [] : ['--']),
    '--pool=threads',
    '--poolOptions.threads.singleThread=true',
    '--poolOptions.threads.minThreads=1',
    '--poolOptions.threads.maxThreads=1',
    '--no-file-parallelism',
    '--maxWorkers=1',
    '--minWorkers=1',
    '--testTimeout=30000',
    '--hookTimeout=30000'
  ];
}

function killGroup(signal) {
  try {
    process.kill(-child.pid, signal);
  } catch {
    // Already gone.
  }
}

function groupStillRunning() {
  try {
    process.kill(-child.pid, 0);
    return true;
  } catch {
    return false;
  }
}

function finish(exitCode, detail) {
  if (finished) return;
  finished = true;
  clearTimeout(timeout);
  clearTimeout(killTimer);
  console.log(`[test:safe] ${exitCode === 0 ? 'PASS' : 'FAIL'} exit=${exitCode}${detail ? ` (${detail})` : ''}`);
  process.exit(exitCode);
}

function finishAfterGroupSettles(exitCode, detail) {
  setTimeout(() => {
    if (groupStillRunning()) {
      console.error(`[test:safe] process group ${child.pid} survived command exit; forcing cleanup`);
      killGroup('SIGKILL');
    }
    finish(exitCode, detail);
  }, GROUP_SETTLE_MS);
}

function stopProcessGroup(exitCode, reason) {
  if (stopping || finished) return;
  stopping = true;
  clearTimeout(timeout);
  console.error(`\n[test:safe] ${reason}; stopping process group ${child.pid}`);
  killGroup('SIGTERM');
  killTimer = setTimeout(() => {
    if (groupStillRunning()) {
      killGroup('SIGKILL');
    }
    finish(exitCode, reason);
  }, GRACE_MS);
}

timeout = setTimeout(() => {
  stopProcessGroup(124, `timed out after ${timeoutMs}ms`);
}, timeoutMs);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopProcessGroup(signal === 'SIGINT' ? 130 : 143, `received ${signal}`);
  });
}

child.on('error', (error) => {
  stopProcessGroup(1, `could not start command: ${error.message}`);
});

child.on('exit', (code, signal) => {
  if (stopping || finished) {
    return;
  }
  finishAfterGroupSettles(signal ? 143 : (code ?? 1), signal ? `child received ${signal}` : undefined);
});
