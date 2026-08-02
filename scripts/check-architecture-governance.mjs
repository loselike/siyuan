#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(repositoryRoot, 'config/architecture/governance-baseline.json');
const moduleBoundaryPath = path.join(repositoryRoot, 'config/architecture/module-boundaries.json');
const printCurrent = process.argv.includes('--print-current');
const skipLint = process.argv.includes('--skip-lint');
const compact = process.argv.includes('--compact');
const selfTest = process.argv.includes('--self-test');

const publicRoutePolicies = {
  'GET /auth/captcha': 'public-captcha',
  'POST /auth/login': 'public-login',
  'GET /health': 'public-health',
  'POST /integrations/mojia/measurements': 'device-token-in-handler'
};

const routePolicyEvidence = {
  'POST /integrations/mojia/measurements': {
    file: 'apps/api/src/modules/data.controller.ts',
    controller: 'DataController',
    handler: 'receiveMojiaMeasurement',
    validator: 'ensureMojiaDeviceToken'
  }
};

function scannerSnapshot() {
  const output = execFileSync(process.execPath, ['scripts/architecture-baseline.mjs', 'json'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
  return JSON.parse(output);
}

function lintSnapshot(workspace) {
  const eslintEntry = path.join(repositoryRoot, 'node_modules/eslint/bin/eslint.js');
  const result = spawnSync(process.execPath, [eslintEntry, '.', '--format', 'json'], {
    cwd: path.join(repositoryRoot, workspace),
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.error) throw result.error;
  return parseLintResult(workspace, result);
}

function parseLintResult(workspace, result) {
  if (![0, 1].includes(result.status)) {
    throw new Error(`${workspace} ESLint failed to execute (exit ${result.status}): ${result.stderr.trim()}`);
  }
  if (!result.stdout?.trim()) throw new Error(`${workspace} ESLint produced no JSON report (exit ${result.status})`);
  const reports = JSON.parse(result.stdout);
  if (!Array.isArray(reports) || reports.length === 0) throw new Error(`${workspace} ESLint returned an empty or invalid report set`);
  for (const report of reports) {
    if (typeof report?.filePath !== 'string' || !Array.isArray(report.messages)) {
      throw new Error(`${workspace} ESLint returned an invalid report entry`);
    }
  }
  const rules = {};
  const files = {};
  let errors = 0;
  let warnings = 0;
  for (const report of reports) {
    const relativeFile = path.relative(path.join(repositoryRoot, workspace), report.filePath).split(path.sep).join('/');
    const fileRules = {};
    for (const message of report.messages) {
      const severity = message.severity === 2 ? 'error' : 'warning';
      const rule = message.ruleId ?? 'fatal-or-parser';
      const key = `${severity}:${rule}`;
      rules[key] = (rules[key] ?? 0) + 1;
      fileRules[key] = (fileRules[key] ?? 0) + 1;
      if (message.severity === 2) errors += 1;
      else warnings += 1;
    }
    if (Object.keys(fileRules).length) files[relativeFile] = Object.fromEntries(Object.entries(fileRules).sort());
  }
  return {
    errors,
    warnings,
    rules: Object.fromEntries(Object.entries(rules).sort()),
    files: Object.fromEntries(Object.entries(files).sort())
  };
}

function routeKey(route) {
  return `${route.method} ${route.route}`;
}

function normalizedRoutes(routes) {
  return routes
    .map((route) => [
      `${routeKey(route)} @ ${route.controller}.${route.handler}`,
      route.auth,
      [...route.permissions].sort(),
      `${route.controller}.${route.handler}`
    ])
    .sort((left, right) => left[0].localeCompare(right[0]) || left[3].localeCompare(right[3]));
}

function duplicateRouteGroups(routes) {
  const grouped = new Map();
  for (const route of routes) {
    const key = routeKey(route);
    grouped.set(key, [...(grouped.get(key) ?? []), route]);
  }
  return [...grouped.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([key, entries]) => `${key}: ${entries
      .map((route) => `${route.controller}.${route.handler}|${route.auth}|${[...route.permissions].sort().join(',')}`)
      .sort()
      .join(' = ')}`)
    .sort();
}

function currentBaseline({ includeLint }) {
  const snapshot = scannerSnapshot();
  const routes = normalizedRoutes(snapshot.routes);
  const noneRoutes = routes.filter((route) => route[1] === 'none');
  for (const route of noneRoutes) {
    const logicalRoute = route[0].split(' @ ')[0];
    if (!publicRoutePolicies[logicalRoute]) throw new Error(`unclassified route without auth metadata: ${logicalRoute}`);
  }
  const dataControllerRoutes = snapshot.routes.filter((route) => route.controller === 'DataController').length;
  const exactDuplicateGroups = snapshot.dependencies.exactDuplicates
    .map((group) => [...group].sort().join(' = '))
    .sort();
  const baseline = {
    version: 1,
    routePolicies: publicRoutePolicies,
    routes,
    debt: {
      dataControllerRoutesMax: dataControllerRoutes,
      apiClientMethodsMax: snapshot.webClient.length,
      apiClientDirectRequestsMax: snapshot.webClient.reduce((total, method) => total + method.requests.length, 0),
      sharedRootImportFilesMax: snapshot.metrics.sharedConsumers.length,
      asAnyMax: snapshot.metrics.asAny,
      directProcessEnvMax: snapshot.metrics.processEnv,
      dependencyCyclesMax: snapshot.dependencies.cycles.length,
      knownOrphanCandidates: [...snapshot.dependencies.orphanCandidates].sort(),
      knownExactDuplicateGroups: exactDuplicateGroups,
      knownDuplicateRouteGroups: duplicateRouteGroups(snapshot.routes),
      prismaRepositoryMethodsMax: snapshot.parity.prisma.length,
      inMemoryRepositoryMethodsMax: snapshot.parity.memory.length
    }
  };
  if (includeLint) {
    baseline.lint = {
      api: lintSnapshot('apps/api'),
      web: lintSnapshot('apps/web')
    };
  }
  return baseline;
}

function compareRoutes(expected, actual, failures) {
  const expectedByKey = new Map(expected.map((route) => [route[0], route]));
  const actualByKey = new Map(actual.map((route) => [route[0], route]));
  for (const [key, expectedRoute] of expectedByKey) {
    const actualRoute = actualByKey.get(key);
    if (!actualRoute) {
      failures.push(`route removed without contract review: ${key}`);
      continue;
    }
    if (JSON.stringify(actualRoute) !== JSON.stringify(expectedRoute)) {
      failures.push(`route auth contract changed: ${key}; expected ${JSON.stringify(expectedRoute)}, received ${JSON.stringify(actualRoute)}`);
    }
  }
  for (const key of actualByKey.keys()) {
    if (!expectedByKey.has(key)) failures.push(`new route requires auth contract review: ${key}`);
  }
}

function assertMaximum(label, actual, maximum, failures) {
  if (!Number.isInteger(actual) || actual < 0 || !Number.isInteger(maximum) || maximum < 0) {
    failures.push(`${label} must be a finite nonnegative integer in both baseline and current snapshot`);
    return;
  }
  if (actual > maximum) failures.push(`${label} increased: ${actual} > baseline ${maximum}`);
}

function compareDebt(expected, actual, failures) {
  for (const key of [
    'dataControllerRoutesMax',
    'apiClientMethodsMax',
    'apiClientDirectRequestsMax',
    'sharedRootImportFilesMax',
    'asAnyMax',
    'directProcessEnvMax',
    'dependencyCyclesMax',
    'prismaRepositoryMethodsMax',
    'inMemoryRepositoryMethodsMax'
  ]) {
    assertMaximum(key, actual[key], expected[key], failures);
  }
  const knownOrphans = new Set(expected.knownOrphanCandidates);
  for (const candidate of actual.knownOrphanCandidates) {
    if (!knownOrphans.has(candidate)) failures.push(`new orphan candidate: ${candidate}`);
  }
  const knownDuplicates = new Set(expected.knownExactDuplicateGroups);
  for (const group of actual.knownExactDuplicateGroups) {
    if (!knownDuplicates.has(group)) failures.push(`new exact duplicate source group: ${group}`);
  }
  const knownDuplicateRoutes = new Set(expected.knownDuplicateRouteGroups);
  for (const group of actual.knownDuplicateRouteGroups) {
    if (!knownDuplicateRoutes.has(group)) failures.push(`new duplicate HTTP route group: ${group}`);
  }
}

function compareLint(expected, actual, failures) {
  for (const workspace of ['api', 'web']) {
    const expectedRules = expected[workspace]?.rules ?? {};
    const actualRules = actual[workspace]?.rules ?? {};
    for (const [rule, count] of Object.entries(actualRules)) {
      const maximum = expectedRules[rule] ?? 0;
      if (count > maximum) failures.push(`${workspace} lint debt increased for ${rule}: ${count} > baseline ${maximum}`);
    }
    const expectedFiles = expected[workspace]?.files ?? {};
    const actualFiles = actual[workspace]?.files ?? {};
    for (const [file, rules] of Object.entries(actualFiles)) {
      for (const [rule, count] of Object.entries(rules)) {
        const maximum = expectedFiles[file]?.[rule] ?? 0;
        if (count > maximum) failures.push(`${workspace} lint debt increased in ${file} for ${rule}: ${count} > baseline ${maximum}`);
      }
    }
  }
}

function checkModuleBoundaries(failures) {
  const config = JSON.parse(readFileSync(moduleBoundaryPath, 'utf8'));
  if (config.version !== 1) {
    failures.push(`unsupported module boundary version: ${config.version}`);
    return;
  }
  for (const module of config.modules) {
    for (const rule of module.files) {
      const absolutePath = path.join(repositoryRoot, rule.path);
      if (!existsSync(absolutePath)) {
        failures.push(`${module.name} required module file is missing: ${rule.path}`);
        continue;
      }
      const source = readFileSync(absolutePath, 'utf8');
      const imports = [...source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)].map((match) => match[1]);
      for (const requiredImport of rule.requiredImports ?? []) {
        if (!imports.includes(requiredImport)) failures.push(`${module.name} ${rule.path} is missing required import: ${requiredImport}`);
      }
      for (const knownDebtImport of rule.knownDebtImports ?? []) {
        if (!imports.includes(knownDebtImport)) failures.push(`${module.name} ${rule.path} resolved recorded import debt; review and remove it from module-boundaries.json: ${knownDebtImport}`);
      }
      for (const forbiddenImport of rule.forbiddenImports ?? []) {
        if (imports.includes(forbiddenImport)) failures.push(`${module.name} ${rule.path} imports forbidden dependency: ${forbiddenImport}`);
      }
      for (const forbiddenText of rule.forbiddenText ?? []) {
        if (source.includes(forbiddenText)) failures.push(`${module.name} ${rule.path} contains forbidden dependency marker: ${forbiddenText}`);
      }
    }
  }
}

function checkRoutePolicyEvidence(failures) {
  for (const [route, evidence] of Object.entries(routePolicyEvidence)) {
    const absolutePath = path.join(repositoryRoot, evidence.file);
    const source = readFileSync(absolutePath, 'utf8');
    const sourceFile = ts.createSourceFile(absolutePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const controller = sourceFile.statements.find((statement) => ts.isClassDeclaration(statement) && statement.name?.text === evidence.controller);
    if (!controller || !ts.isClassDeclaration(controller)) {
      failures.push(`${route} policy controller is missing: ${evidence.controller}`);
      continue;
    }
    const handler = controller.members.find((member) => ts.isMethodDeclaration(member) && member.name?.getText(sourceFile) === evidence.handler);
    const firstStatement = handler && ts.isMethodDeclaration(handler) ? handler.body?.statements[0] : undefined;
    const firstCall = firstStatement && ts.isExpressionStatement(firstStatement) && ts.isCallExpression(firstStatement.expression)
      ? firstStatement.expression
      : undefined;
    const isValidatorCall = Boolean(
      firstCall
      && ts.isPropertyAccessExpression(firstCall.expression)
      && firstCall.expression.expression.kind === ts.SyntaxKind.ThisKeyword
      && firstCall.expression.name.text === evidence.validator
      && firstCall.arguments.map((argument) => argument.getText(sourceFile)).join(',') === 'headers,queryToken'
    );
    if (!isValidatorCall) failures.push(`${route} must call ${evidence.validator}(headers, queryToken) as the handler's first statement`);

    const validator = controller.members.find((member) => ts.isMethodDeclaration(member) && member.name?.getText(sourceFile) === evidence.validator);
    const validatorText = validator && ts.isMethodDeclaration(validator) ? validator.getText(sourceFile) : '';
    for (const requiredText of ['process.env.MOJIA_DEVICE_TOKEN', 'UnauthorizedException']) {
      if (!validatorText.includes(requiredText)) failures.push(`${route} validator ${evidence.validator} is missing required security marker: ${requiredText}`);
    }
  }
}

function assertGovernanceSchema(value, { includeLint }) {
  if (!value || typeof value !== 'object' || value.version !== 1) throw new Error('architecture governance baseline must be a version 1 object');
  if (!value.routePolicies || typeof value.routePolicies !== 'object' || Array.isArray(value.routePolicies)) throw new Error('routePolicies must be an object');
  if (!Array.isArray(value.routes)) throw new Error('routes must be an array');
  for (const route of value.routes) {
    if (
      !Array.isArray(route)
      || route.length !== 4
      || typeof route[0] !== 'string'
      || !['auth', 'permission', 'none'].includes(route[1])
      || !Array.isArray(route[2])
      || route[2].some((permission) => typeof permission !== 'string')
      || typeof route[3] !== 'string'
    ) {
      throw new Error(`invalid route contract entry: ${JSON.stringify(route)}`);
    }
  }
  const numericDebtKeys = [
    'dataControllerRoutesMax',
    'apiClientMethodsMax',
    'apiClientDirectRequestsMax',
    'sharedRootImportFilesMax',
    'asAnyMax',
    'directProcessEnvMax',
    'dependencyCyclesMax',
    'prismaRepositoryMethodsMax',
    'inMemoryRepositoryMethodsMax'
  ];
  if (!value.debt || typeof value.debt !== 'object') throw new Error('debt budget must be an object');
  for (const key of numericDebtKeys) {
    if (!Number.isInteger(value.debt[key]) || value.debt[key] < 0) throw new Error(`debt.${key} must be a finite nonnegative integer`);
  }
  for (const key of ['knownOrphanCandidates', 'knownExactDuplicateGroups', 'knownDuplicateRouteGroups']) {
    if (!Array.isArray(value.debt[key]) || value.debt[key].some((item) => typeof item !== 'string')) throw new Error(`debt.${key} must be a string array`);
  }
  if (!includeLint) return;
  if (!value.lint || typeof value.lint !== 'object') throw new Error('lint baseline must be an object');
  for (const workspace of ['api', 'web']) {
    const lint = value.lint[workspace];
    if (!lint || !Number.isInteger(lint.errors) || lint.errors < 0 || !Number.isInteger(lint.warnings) || lint.warnings < 0) {
      throw new Error(`lint.${workspace} totals must be finite nonnegative integers`);
    }
    if (!lint.rules || typeof lint.rules !== 'object' || Array.isArray(lint.rules)) throw new Error(`lint.${workspace}.rules must be an object`);
    if (!lint.files || typeof lint.files !== 'object' || Array.isArray(lint.files)) throw new Error(`lint.${workspace}.files must be an object`);
    for (const [rule, count] of Object.entries(lint.rules)) {
      if (!rule || !Number.isInteger(count) || count < 0) throw new Error(`lint.${workspace}.rules contains an invalid count`);
    }
    for (const [file, rules] of Object.entries(lint.files)) {
      if (!file || !rules || typeof rules !== 'object' || Array.isArray(rules)) throw new Error(`lint.${workspace}.files contains an invalid entry`);
      for (const count of Object.values(rules)) {
        if (!Number.isInteger(count) || count < 0) throw new Error(`lint.${workspace}.files contains an invalid rule count`);
      }
    }
  }
}

function runSelfTest() {
  const failures = [];
  compareRoutes(
    [['GET /sample', 'auth', [], 'SampleController.get']],
    [
      ['GET /sample', 'none', [], 'SampleController.get'],
      ['POST /sample', 'permission', ['sample:create'], 'SampleController.create']
    ],
    failures
  );
  compareDebt(
    {
      dataControllerRoutesMax: 1,
      apiClientMethodsMax: 1,
      apiClientDirectRequestsMax: 1,
      sharedRootImportFilesMax: 1,
      asAnyMax: 1,
      directProcessEnvMax: 1,
      dependencyCyclesMax: 0,
      knownOrphanCandidates: [],
      knownExactDuplicateGroups: [],
      knownDuplicateRouteGroups: [],
      prismaRepositoryMethodsMax: 1,
      inMemoryRepositoryMethodsMax: 1
    },
    {
      dataControllerRoutesMax: 2,
      apiClientMethodsMax: 1,
      apiClientDirectRequestsMax: 1,
      sharedRootImportFilesMax: 1,
      asAnyMax: 1,
      directProcessEnvMax: 1,
      dependencyCyclesMax: 1,
      knownOrphanCandidates: ['new-orphan.ts'],
      knownExactDuplicateGroups: ['a.ts = b.ts'],
      knownDuplicateRouteGroups: ['GET /duplicate: A.get|auth| = B.get|auth|'],
      prismaRepositoryMethodsMax: 1,
      inMemoryRepositoryMethodsMax: 1
    },
    failures
  );
  compareLint(
    { api: { rules: { 'error:no-undef': 1 }, files: {} }, web: { rules: {}, files: {} } },
    {
      api: { rules: { 'error:no-undef': 2 }, files: { 'new.ts': { 'error:no-undef': 1 } } },
      web: { rules: { 'error:new-rule': 1 }, files: { 'new.tsx': { 'error:new-rule': 1 } } }
    },
    failures
  );
  const requiredFragments = [
    'route auth contract changed',
    'new route requires auth contract review',
    'dataControllerRoutesMax increased',
    'dependencyCyclesMax increased',
    'new orphan candidate',
    'new exact duplicate source group',
    'new duplicate HTTP route group',
    'api lint debt increased',
    'web lint debt increased'
  ];
  for (const fragment of requiredFragments) {
    if (!failures.some((failure) => failure.includes(fragment))) throw new Error(`architecture self-test missed failure class: ${fragment}`);
  }
  let rejectedEmptyLint = false;
  try {
    parseLintResult('fixture', { status: 1, stdout: '', stderr: '' });
  } catch (error) {
    rejectedEmptyLint = error instanceof Error && error.message.includes('produced no JSON report');
  }
  if (!rejectedEmptyLint) throw new Error('architecture self-test must reject ESLint exit 1 with empty stdout');
  let rejectedInvalidBudget = false;
  try {
    assertGovernanceSchema({ version: 1, routePolicies: {}, routes: [], debt: {} }, { includeLint: false });
  } catch (error) {
    rejectedInvalidBudget = error instanceof Error && error.message.includes('debt.dataControllerRoutesMax');
  }
  if (!rejectedInvalidBudget) throw new Error('architecture self-test must reject missing debt budget fields');
  execFileSync(process.execPath, ['scripts/architecture-baseline.mjs', 'self-test'], { cwd: repositoryRoot, stdio: 'pipe' });
  console.log(`[architecture:check] SELF-TEST PASS (${requiredFragments.length + 3} failure classes)`);
}

if (selfTest) {
  runSelfTest();
  process.exit(0);
}

if (printCurrent) {
  console.log(JSON.stringify(currentBaseline({ includeLint: !skipLint }), null, compact ? 0 : 2));
  process.exit(0);
}

const expected = JSON.parse(readFileSync(baselinePath, 'utf8'));
const actual = currentBaseline({ includeLint: !skipLint });
assertGovernanceSchema(expected, { includeLint: !skipLint });
assertGovernanceSchema(actual, { includeLint: !skipLint });
const failures = [];

if (JSON.stringify(expected.routePolicies) !== JSON.stringify(publicRoutePolicies)) {
  failures.push('route policy classification changed without updating the governance checker');
}
compareRoutes(expected.routes, actual.routes, failures);
compareDebt(expected.debt, actual.debt, failures);
if (!skipLint) compareLint(expected.lint, actual.lint, failures);
checkModuleBoundaries(failures);
checkRoutePolicyEvidence(failures);

if (failures.length) {
  for (const failure of failures) console.error(`[architecture:check] ${failure}`);
  process.exit(1);
}

console.log(`[architecture:check] PASS (${actual.routes.length} route contracts; lint ${skipLint ? 'skipped' : 'no-new-debt'})`);
