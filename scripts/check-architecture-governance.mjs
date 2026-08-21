#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
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
const nakedBodyDecoratorsMax = 225;
const rootAppModuleDebtMax = Object.freeze({
  lines: 414,
  directControllers: 40,
  directProviders: 66,
  legacyPrismaRepositoryBindings: 24
});

const hotspotFiles = [
  'apps/api/src/modules/prisma.repository.ts',
  'apps/api/src/modules/in-memory.repository.ts',
  'apps/api/src/modules/data.controller.ts',
  'packages/shared/src/index.ts',
  'apps/web/src/apiClient.ts',
  'apps/web/src/styles.css',
  'apps/web/src/modules/testSupport/appTestHarness.tsx',
  'apps/web/src/modules/warehouse/WarehousePage.tsx',
  'apps/web/src/modules/pricing/PricingPage.tsx',
  'apps/web/src/modules/masterData/MasterDataPage.tsx'
];

const publicRoutePolicies = {
  'GET /auth/captcha': 'public-captcha',
  'POST /auth/login': 'public-login',
  'GET /health': 'public-health',
  'POST /integrations/mojia/measurements': 'device-token-in-handler'
};

const routePolicyEvidence = {
  'POST /integrations/mojia/measurements': {
    file: 'apps/api/src/modules/warehouse/integration/mojia-measurement.controller.ts',
    controller: 'MojiaMeasurementController',
    handler: 'receiveMojiaMeasurement',
    validator: 'ensureMojiaDeviceToken'
  }
};

const runtimeInputEvidence = [
  {
    file: 'apps/api/src/modules/warehouse/package/warehouse-package-lifecycle.controller.ts',
    controller: 'WarehousePackageLifecycleController',
    handler: 'updateWarehousePackage',
    schema: 'warehousePackageUpdateInputSchema'
  },
  {
    file: 'apps/api/src/modules/warehouse/package/warehouse-package-lifecycle.controller.ts',
    controller: 'WarehousePackageLifecycleController',
    handler: 'updateWarehousePackageRemark',
    schema: 'warehousePackageRemarkInputSchema'
  },
  {
    file: 'apps/api/src/modules/warehouse/package/warehouse-package-lifecycle.controller.ts',
    controller: 'WarehousePackageLifecycleController',
    handler: 'updateWarehousePackageException',
    schema: 'warehousePackageExceptionInputSchema'
  },
  {
    file: 'apps/api/src/modules/warehouse/inventory/warehouse-inventory-query.controller.ts',
    controller: 'WarehouseInventoryQueryController',
    handler: 'deleteTodayReceiptPackages',
    schema: 'warehousePackageDeleteInputSchema'
  },
  {
    file: 'apps/api/src/modules/warehouse/inventory/warehouse-inventory-query.controller.ts',
    controller: 'WarehouseInventoryQueryController',
    handler: 'deleteInStockPackages',
    schema: 'warehousePackageDeleteInputSchema'
  }
];

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolutePath);
    return entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name) ? [absolutePath] : [];
  });
}

function countNakedBodyDecorators() {
  const controllersRoot = path.join(repositoryRoot, 'apps/api/src/modules');
  return sourceFiles(controllersRoot)
    .filter((file) => file.endsWith('.controller.ts'))
    .reduce((total, file) => total + (readFileSync(file, 'utf8').match(/@Body\(\)/g)?.length ?? 0), 0);
}

function checkRuntimeInputDebt(failures) {
  assertMaximum('naked @Body() decorators', countNakedBodyDecorators(), nakedBodyDecoratorsMax, failures);
  for (const evidence of runtimeInputEvidence) {
    const absolutePath = path.join(repositoryRoot, evidence.file);
    const source = readFileSync(absolutePath, 'utf8');
    if (!hasRuntimeInputBinding(source, absolutePath, evidence)) {
      failures.push(`${evidence.controller}.${evidence.handler} must bind @Body(new RuntimeInputPipe(${evidence.schema}))`);
    }
  }
}

function hasRuntimeInputBinding(source, fileName, evidence) {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const controller = sourceFile.statements.find(
    (statement) => ts.isClassDeclaration(statement) && statement.name?.text === evidence.controller
  );
  if (!controller || !ts.isClassDeclaration(controller)) return false;
  const handler = controller.members.find(
    (member) => ts.isMethodDeclaration(member) && member.name?.getText(sourceFile) === evidence.handler
  );
  if (!handler || !ts.isMethodDeclaration(handler)) return false;
  return handler.parameters.some((parameter) => {
    if (!ts.canHaveDecorators(parameter)) return false;
    return (ts.getDecorators(parameter) ?? []).some((decorator) => {
      const bodyCall = decorator.expression;
      if (!ts.isCallExpression(bodyCall) || bodyCall.expression.getText(sourceFile) !== 'Body') return false;
      const runtimePipe = bodyCall.arguments[0];
      return Boolean(
        runtimePipe
        && ts.isNewExpression(runtimePipe)
        && runtimePipe.expression.getText(sourceFile) === 'RuntimeInputPipe'
        && runtimePipe.arguments?.[0]?.getText(sourceFile) === evidence.schema
      );
    });
  });
}

function rootAppModuleAssemblySnapshot() {
  const appModulePath = path.join(repositoryRoot, 'apps/api/src/modules/app.module.ts');
  const source = readFileSync(appModulePath, 'utf8');
  const sourceFile = ts.createSourceFile(appModulePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const appModule = sourceFile.statements.find(
    (statement) => ts.isClassDeclaration(statement) && statement.name?.text === 'AppModule'
  );
  if (!appModule || !ts.isClassDeclaration(appModule) || !ts.canHaveDecorators(appModule)) {
    throw new Error('AppModule class metadata is missing');
  }
  const moduleDecorator = (ts.getDecorators(appModule) ?? []).find(
    (decorator) => ts.isCallExpression(decorator.expression)
      && decorator.expression.expression.getText(sourceFile) === 'Module'
  );
  if (!moduleDecorator || !ts.isCallExpression(moduleDecorator.expression)) {
    throw new Error('AppModule @Module decorator is missing');
  }
  const metadata = moduleDecorator.expression.arguments[0];
  if (!metadata || !ts.isObjectLiteralExpression(metadata)) {
    throw new Error('AppModule @Module metadata must be an object literal');
  }
  const arrayEntryCount = (propertyName) => {
    const property = metadata.properties.find(
      (entry) => ts.isPropertyAssignment(entry) && entry.name.getText(sourceFile) === propertyName
    );
    if (!property || !ts.isPropertyAssignment(property) || !ts.isArrayLiteralExpression(property.initializer)) {
      throw new Error(`AppModule ${propertyName} must be an array literal`);
    }
    return property.initializer.elements.length;
  };
  return {
    lines: source.trimEnd().split(/\r?\n/).length,
    directControllers: arrayEntryCount('controllers'),
    directProviders: arrayEntryCount('providers'),
    legacyPrismaRepositoryBindings: source.match(/useExisting:\s*PrismaRepository/g)?.length ?? 0
  };
}

function validateRootAppModuleDebt(actual, failures) {
  assertMaximum('AppModule lines', actual.lines, rootAppModuleDebtMax.lines, failures);
  assertMaximum(
    'AppModule direct controllers',
    actual.directControllers,
    rootAppModuleDebtMax.directControllers,
    failures
  );
  assertMaximum(
    'AppModule direct providers',
    actual.directProviders,
    rootAppModuleDebtMax.directProviders,
    failures
  );
  assertMaximum(
    'AppModule legacy PrismaRepository bindings',
    actual.legacyPrismaRepositoryBindings,
    rootAppModuleDebtMax.legacyPrismaRepositoryBindings,
    failures
  );
}

function checkRootAppModuleDebt(failures) {
  validateRootAppModuleDebt(rootAppModuleAssemblySnapshot(), failures);
}

function permissionKeyDefinitionFiles(files) {
  return files
    .filter((file) => /(?:^|\s)(?:export\s+)?type\s+PermissionKey\s*=/.test(readFileSync(file, 'utf8')))
    .map((file) => path.relative(repositoryRoot, file).split(path.sep).join('/'))
    .sort();
}

function validatePermissionKeyDefinitions(definitions, failures) {
  const canonical = 'packages/shared/src/permissions.ts';
  if (definitions.length !== 1 || definitions[0] !== canonical) {
    failures.push(`PermissionKey must have one canonical definition in ${canonical}; found ${definitions.join(', ') || 'none'}`);
  }
}

function checkPermissionKeyContract(failures) {
  const roots = ['apps/api/src', 'apps/web/src', 'packages/shared/src'].map((directory) => path.join(repositoryRoot, directory));
  const definitions = permissionKeyDefinitionFiles(roots.flatMap(sourceFiles));
  validatePermissionKeyDefinitions(definitions, failures);
  for (const bridge of ['apps/api/src/modules/rbac.ts', 'apps/web/src/apiClient.ts']) {
    const source = readFileSync(path.join(repositoryRoot, bridge), 'utf8');
    if (!source.includes("import type { PermissionKey } from '@siyuan/shared/permissions';")) {
      failures.push(`${bridge} must import PermissionKey from @siyuan/shared/permissions`);
    }
    if (!source.includes("export type { PermissionKey } from '@siyuan/shared/permissions';")) {
      failures.push(`${bridge} must preserve its compatibility re-export for PermissionKey`);
    }
  }
}

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
      inMemoryRepositoryMethodsMax: snapshot.parity.memory.length,
      hotspotLinesMax: Object.fromEntries(hotspotFiles.map((file) => {
        const source = readFileSync(path.join(repositoryRoot, file), 'utf8');
        return [file, source.match(/\n/g)?.length ?? 0];
      }))
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
  const expectedHotspots = expected.hotspotLinesMax ?? {};
  const actualHotspots = actual.hotspotLinesMax ?? {};
  for (const file of Object.keys(expectedHotspots)) {
    if (!(file in actualHotspots)) failures.push(`recorded hotspot is no longer governed: ${file}`);
  }
  for (const [file, lines] of Object.entries(actualHotspots)) {
    if (!(file in expectedHotspots)) {
      failures.push(`new hotspot requires an explicit line budget: ${file}`);
      continue;
    }
    assertMaximum(`hotspot lines ${file}`, lines, expectedHotspots[file], failures);
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
  if (!value.debt.hotspotLinesMax || typeof value.debt.hotspotLinesMax !== 'object' || Array.isArray(value.debt.hotspotLinesMax)) {
    throw new Error('debt.hotspotLinesMax must be an object');
  }
  for (const file of hotspotFiles) {
    if (!Number.isInteger(value.debt.hotspotLinesMax[file]) || value.debt.hotspotLinesMax[file] < 0) {
      throw new Error(`debt.hotspotLinesMax.${file} must be a finite nonnegative integer`);
    }
  }
  for (const file of Object.keys(value.debt.hotspotLinesMax)) {
    if (!hotspotFiles.includes(file)) throw new Error(`debt.hotspotLinesMax contains an unrecognized hotspot: ${file}`);
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
      inMemoryRepositoryMethodsMax: 1,
      hotspotLinesMax: Object.fromEntries(hotspotFiles.map((file) => [file, 1]))
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
      inMemoryRepositoryMethodsMax: 1,
      hotspotLinesMax: Object.fromEntries(hotspotFiles.map((file, index) => [file, index === 0 ? 2 : 1]))
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
  validateRootAppModuleDebt({
    lines: rootAppModuleDebtMax.lines + 1,
    directControllers: rootAppModuleDebtMax.directControllers + 1,
    directProviders: rootAppModuleDebtMax.directProviders + 1,
    legacyPrismaRepositoryBindings: rootAppModuleDebtMax.legacyPrismaRepositoryBindings + 1
  }, failures);
  const requiredFragments = [
    'route auth contract changed',
    'new route requires auth contract review',
    'dataControllerRoutesMax increased',
    'dependencyCyclesMax increased',
    'new orphan candidate',
    'new exact duplicate source group',
    'new duplicate HTTP route group',
    'hotspot lines apps/api/src/modules/prisma.repository.ts increased',
    'api lint debt increased',
    'web lint debt increased',
    'AppModule lines increased',
    'AppModule direct controllers increased',
    'AppModule direct providers increased',
    'AppModule legacy PrismaRepository bindings increased'
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
  const permissionFailures = [];
  validatePermissionKeyDefinitions(
    ['apps/api/src/modules/rbac.ts', 'packages/shared/src/permissions.ts'],
    permissionFailures
  );
  if (!permissionFailures.some((failure) => failure.includes('one canonical definition'))) {
    throw new Error('architecture self-test must reject duplicate PermissionKey definitions');
  }
  const runtimeEvidenceFixture = {
    controller: 'FixtureController',
    handler: 'update',
    schema: 'fixtureSchema'
  };
  const validRuntimeBinding = `class FixtureController {
    update(@Body(new RuntimeInputPipe(fixtureSchema)) body: unknown) {}
  }`;
  const invalidRuntimeBinding = `class FixtureController {
    update(@Body() body: unknown) {}
  }`;
  if (!hasRuntimeInputBinding(validRuntimeBinding, 'fixture.controller.ts', runtimeEvidenceFixture)) {
    throw new Error('architecture self-test must accept an exact runtime input binding');
  }
  if (hasRuntimeInputBinding(invalidRuntimeBinding, 'fixture.controller.ts', runtimeEvidenceFixture)) {
    throw new Error('architecture self-test must reject a naked body binding');
  }
  execFileSync(process.execPath, ['scripts/architecture-baseline.mjs', 'self-test'], { cwd: repositoryRoot, stdio: 'pipe' });
  console.log(`[architecture:check] SELF-TEST PASS (${requiredFragments.length + 4} failure classes)`);
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
checkPermissionKeyContract(failures);
checkRuntimeInputDebt(failures);
checkRootAppModuleDebt(failures);

if (failures.length) {
  for (const failure of failures) console.error(`[architecture:check] ${failure}`);
  process.exit(1);
}

console.log(`[architecture:check] PASS (${actual.routes.length} route contracts; lint ${skipLint ? 'skipped' : 'no-new-debt'})`);
