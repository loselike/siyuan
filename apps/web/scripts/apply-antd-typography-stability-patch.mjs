import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const antdPackagePath = require.resolve('antd/package.json');
const antdRoot = dirname(antdPackagePath);
const antdPackage = JSON.parse(readFileSync(antdPackagePath, 'utf8'));
const expectedVersion = '5.29.3';
const checkOnly = process.argv.includes('--check');
const marker = 'Sunny stability guard: skip no-op layout state updates';

if (antdPackage.version !== expectedVersion) {
  throw new Error(`AntD Typography stability patch only supports ${expectedVersion}; found ${antdPackage.version}. Review the upstream Ellipsis implementation before changing the pinned version.`);
}

const targets = [
  {
    path: join(antdRoot, 'es/typography/Base/Ellipsis.js'),
    before: `  useLayoutEffect(() => {
    if (enableMeasure && width && nodeLen) {
      setNeedEllipsis(STATUS_MEASURE_PREPARE);
    } else {
      setNeedEllipsis(STATUS_MEASURE_NONE);
    }
  }, [width, text, rows, enableMeasure, nodeList]);`,
    after: `  useLayoutEffect(() => {
    const nextMeasureStatus = enableMeasure && width && nodeLen ? STATUS_MEASURE_PREPARE : STATUS_MEASURE_NONE;
    // ${marker}. React 19 counts these layout updates even when the value is unchanged.
    if (needEllipsis !== nextMeasureStatus) {
      setNeedEllipsis(nextMeasureStatus);
    }
  }, [width, text, rows, enableMeasure, nodeList]);`
  },
  {
    path: join(antdRoot, 'lib/typography/Base/Ellipsis.js'),
    before: `  (0, _useLayoutEffect.default)(() => {
    if (enableMeasure && width && nodeLen) {
      setNeedEllipsis(STATUS_MEASURE_PREPARE);
    } else {
      setNeedEllipsis(STATUS_MEASURE_NONE);
    }
  }, [width, text, rows, enableMeasure, nodeList]);`,
    after: `  (0, _useLayoutEffect.default)(() => {
    const nextMeasureStatus = enableMeasure && width && nodeLen ? STATUS_MEASURE_PREPARE : STATUS_MEASURE_NONE;
    // ${marker}. React 19 counts these layout updates even when the value is unchanged.
    if (needEllipsis !== nextMeasureStatus) {
      setNeedEllipsis(nextMeasureStatus);
    }
  }, [width, text, rows, enableMeasure, nodeList]);`
  }
];

for (const target of targets) {
  const source = readFileSync(target.path, 'utf8');
  if (source.includes(marker)) {
    continue;
  }
  if (checkOnly) {
    throw new Error(`AntD Typography stability patch is missing from ${target.path}`);
  }
  if (!source.includes(target.before)) {
    throw new Error(`AntD Typography stability patch could not find the expected source in ${target.path}`);
  }
  writeFileSync(target.path, source.replace(target.before, target.after));
}

for (const target of targets) {
  const source = readFileSync(target.path, 'utf8');
  if (!source.includes(marker) || !source.includes('if (needEllipsis !== nextMeasureStatus)')) {
    throw new Error(`AntD Typography stability patch verification failed for ${target.path}`);
  }
}

console.log(`AntD ${expectedVersion} Typography stability patch ${checkOnly ? 'verified' : 'ready'}.`);
